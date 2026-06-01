using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Ingestion;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Adapters.Common;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// Logic dùng chung: từ raw scraped data của extension (1688/Taobao/Tmall) →
// lookup/upsert Platform → Shop → Product → Variant. KHÔNG add cart, KHÔNG log.
// Dùng bởi ExtensionCartService (add-from-extension) và ProductIngestionService (resolve-url).
// Lưu ý: UpsertFromRawAsync tự mở transaction → KHÔNG bọc thêm transaction ở đây (tránh nested).
public class ExtensionProductUpserter(
    IPlatformRepository           platformRepo,
    IPlatformShopRepository       shopRepo,
    IProductCategoryRepository    categoryRepo,
    IProductService               productService,
    IModule1UnitOfWork            uow,
    ILogger<ExtensionProductUpserter> logger)
{
    // Kết quả upsert: product detail vừa lưu + variant khớp với lựa chọn user.
    public record Result(ProductDetailResponse Product, Guid MatchedVariantId, bool IsForbidden, string? ForbiddenReason);

    public async Task<Result> UpsertAsync(ExtensionScrapedData d, Guid? categoryId,
        string originalUrl, CancellationToken ct = default)
    {
        // 1. Lookup Platform
        var platformName = NormalizePlatformName(d.Platform);
        var platforms    = await platformRepo.GetAllActiveAsync(ct);
        var platform     = platforms.FirstOrDefault(p =>
            p.Name.Equals(platformName, StringComparison.OrdinalIgnoreCase))
            ?? throw new PlatformNotFoundException(platformName);

        // 2. Upsert PlatformShop
        var shop = await shopRepo.GetByExternalIdAsync(platform.Id, d.ShopIdOnPlatform, ct);
        if (shop is null)
        {
            shop = PlatformShop.Create(platform.Id, d.ShopIdOnPlatform, d.ShopName, d.ShopUrl);
            await shopRepo.AddAsync(shop, ct);
            await uow.SaveChangesAsync(ct);
            logger.LogInformation("Auto-created shop: {Name} ({ExtId}) on {Platform}",
                shop.ShopName, shop.ShopIdOnPlatform, platform.Name);
        }
        if (shop.IsBlacklisted)
            throw new BlacklistedShopException(shop.ShopName);

        // 3. Category — fallback category đầu tiên
        var resolvedCategoryId = categoryId
            ?? (await categoryRepo.GetAllAsync(activeOnly: true, ct)).First().Id;

        // 4. Giá → CNY
        var priceCny = ConvertToCny(d.PricePromotion ?? d.PriceOriginal, d.Currency);

        // 5. Variant name
        var variantName = string.IsNullOrWhiteSpace(d.PropertiesOriginal)
            ? "Default" : d.PropertiesOriginal!.Trim();
        var translatedName = string.IsNullOrWhiteSpace(d.PropertiesTranslated)
            ? null : d.PropertiesTranslated!.Trim();

        // 6. Images (dedupe)
        var imageList = new List<string>();
        if (!string.IsNullOrWhiteSpace(d.PrimaryImageUrl)) imageList.Add(d.PrimaryImageUrl);
        if (d.ImageUrls is not null)
            imageList.AddRange(d.ImageUrls.Where(u => !string.IsNullOrWhiteSpace(u) && !imageList.Contains(u)));
        var images = imageList.Select((url, idx) => new UpsertImageRequest(
            SourceUrl: url, IsPrimary: idx == 0, SortOrder: idx,
            SourceUrlHash: HashHelper.ComputeUrlHash(url))).ToList();

        // 7. Price tiers — sanitize vì data scrape không đáng tin (max < min làm vỡ entity).
        var tiers = SanitizeTiers(d.PriceTiers, d.Currency);

        // 8. Upsert product (UpsertFromRawAsync tự kiểm tra hàng cấm + tự transaction)
        var slug = SlugHelper.GenerateSlug(d.TitleTranslated ?? d.TitleOriginal, d.PlatformProductId);
        var upsertReq = new UpsertProductRequest(
            ShopId:            shop.Id,
            CategoryId:        resolvedCategoryId,
            PlatformProductId: d.PlatformProductId,
            OriginalTitle:     d.TitleOriginal,
            Slug:              slug,
            OriginalUrl:       originalUrl,
            TranslatedTitle:   d.TitleTranslated,
            SeoDescription:    null,
            CrawlTaskId:       null,
            Variants: new List<UpsertVariantRequest>
            {
                new(VariantName:     variantName,
                    TranslatedName:  translatedName,
                    PriceCny:        priceCny,
                    SkuIdOnPlatform: d.SelectedSkuId ?? d.PlatformProductId,
                    StockRaw:        d.Stock,
                    ImageUrl:        d.PrimaryImageUrl,
                    SortOrder:       0,
                    PriceTiers:      tiers),
            },
            Images:     images,
            Attributes: new List<UpsertAttributeRequest>());

        var savedProduct = await productService.UpsertFromRawAsync(upsertReq, ct);

        var matchedVariant = savedProduct.Variants.FirstOrDefault(v => v.VariantName == variantName)
                          ?? savedProduct.Variants.First();

        return new Result(savedProduct, matchedVariant.Id,
            savedProduct.IsForbidden, savedProduct.ForbiddenReason);
    }

    // ── Helpers (shared) ────────────────────────────────────────────────────────

    // Làm sạch price tiers từ data scrape. Không tin MaxQuantity client gửi: dẫn xuất lại
    // max = (min của tier kế tiếp - 1) để luôn hợp lệ với ProductPriceTier.Create.
    private static List<UpsertPriceTierRequest> SanitizeTiers(
        IEnumerable<ExtensionPriceTierDto>? raw, string currency)
    {
        if (raw is null) return new List<UpsertPriceTierRequest>();

        // Lọc tier hợp lệ cơ bản, chuẩn hoá min >= 1, dedupe theo min (giữ tier đầu mỗi mức), sort.
        var mins = raw
            .Where(t => t.MinQuantity >= 1 && t.PriceOriginal > 0)
            .GroupBy(t => Math.Max(t.MinQuantity, 1))
            .Select(g => g.First())
            .OrderBy(t => Math.Max(t.MinQuantity, 1))
            .ToList();

        var result = new List<UpsertPriceTierRequest>();
        for (var i = 0; i < mins.Count; i++)
        {
            var min = Math.Max(mins[i].MinQuantity, 1);
            int? max = i + 1 < mins.Count ? Math.Max(mins[i + 1].MinQuantity, 1) - 1 : null;

            // Mép biên: nếu max dẫn xuất < min thì bỏ tier này (min trùng/sát nhau).
            if (max.HasValue && max.Value < min) continue;

            result.Add(new UpsertPriceTierRequest(
                MinQuantity: min,
                MaxQuantity: max,
                PriceCny: ConvertToCny(mins[i].PriceOriginal, currency)));
        }
        return result;
    }

    public static string NormalizePlatformName(string p) => p.Trim().ToUpperInvariant() switch
    {
        "TAOBAO"  => "Taobao",
        "TMALL"   => "Tmall",
        "1688"    => "1688",
        "ALIBABA" => "Alibaba",
        "RAKUTEN" => "Rakuten",
        _         => p.Trim(),
    };

    public static decimal ConvertToCny(decimal price, string currency)
    {
        var rate = currency.Trim().ToUpperInvariant() switch
        {
            "CNY" => 1m,
            "USD" => 7.2m,
            "JPY" => 0.048m,
            "EUR" => 7.8m,
            "GBP" => 9.1m,
            "VND" => 0.000295m,
            _     => 1m,
        };
        return Math.Round(price * rate, 2);
    }
}
