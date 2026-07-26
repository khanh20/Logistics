using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Ingestion;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
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
    CategoryAutoClassifier        autoClassifier,
    BackgroundCategoryClassifier  backgroundClassifier,
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
        else if (ShouldUpdateShopName(shop.ShopName, d.ShopName))
        {
            // Gỡ "đóng băng": shop đã tồn tại nhưng tên cũ là placeholder/khác → cập nhật tên thật.
            shop.UpdateInfo(d.ShopName, d.ShopUrl);
            await shopRepo.UpdateAsync(shop, ct);
            await uow.SaveChangesAsync(ct);
            logger.LogInformation("Updated shop name: {ExtId} on {Platform} → {Name}",
                shop.ShopIdOnPlatform, platform.Name, shop.ShopName);
        }
        if (shop.IsBlacklisted)
            throw new BlacklistedShopException(shop.ShopName);

        // 3. Category TẠM (nhanh, KHÔNG chặn bởi ML) — explicit hoặc cats[0].
        // Classify thật chạy nền sau khi lưu (xem cuối hàm) rồi cập nhật lại category.
        var resolvedCategoryId = await autoClassifier.ResolveProvisionalAsync(categoryId, ct);

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

        // 8. Variants: nếu extension liệt kê được toàn bộ SKU thì upsert tất cả;
        //    không thì giữ 1 variant từ lựa chọn hiện tại (như cũ). Mọi variant cùng
        //    thừa hưởng bậc giá offer-level khi bản thân nó không có bậc giá riêng.
        var variantReqs = BuildVariantRequests(d, variantName, translatedName, priceCny, tiers);

        // 9. Upsert product (UpsertFromRawAsync tự kiểm tra hàng cấm + tự transaction)
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
            Variants:          variantReqs,
            Images:            images,
            Attributes:        new List<UpsertAttributeRequest>());

        var savedProduct = await productService.UpsertFromRawAsync(upsertReq, ct);

        // Khách không chỉ định category → phân loại thật (ML) chạy NỀN, cập nhật lại category
        // sau vài giây. Product đã ở DB với id/variant thật nên xem chi tiết + thêm giỏ hoạt
        // động ngay, không phải chờ classify.
        if (categoryId is null && !savedProduct.IsForbidden)
            backgroundClassifier.Enqueue(savedProduct.Id,
                d.TitleTranslated ?? d.TitleOriginal, d.PrimaryImageUrl, null);

        // Variant khớp lựa chọn hiện tại (để add cart). Tên từ DOM (PropertiesOriginal)
        // có thể khác định dạng nhãn với tên liệt kê từ skuMap → so khớp thêm theo tập
        // GIÁ TRỊ (bỏ nhãn "颜色:") để không add nhầm variant khi có nhiều SKU.
        var selKey = VariantValueKey(variantName);
        var matchedVariant =
            savedProduct.Variants.FirstOrDefault(v => v.VariantName == variantName)
            ?? (selKey.Length > 0
                    ? savedProduct.Variants.FirstOrDefault(v => VariantValueKey(v.VariantName) == selKey)
                    : null)
            ?? savedProduct.Variants.First();

        return new Result(savedProduct, matchedVariant.Id,
            savedProduct.IsForbidden, savedProduct.ForbiddenReason);
    }

    // Tập giá trị đã chuẩn hoá của 1 tên variant, bỏ nhãn: "颜色:红色;尺码:S" → "S|红色".
    private static string VariantValueKey(string? name) =>
        string.Join("|", (name ?? string.Empty)
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => { var i = p.LastIndexOf(':'); return (i >= 0 ? p[(i + 1)..] : p).Trim(); })
            .Where(s => s.Length > 0)
            .OrderBy(s => s, StringComparer.Ordinal));

    // Dựng danh sách UpsertVariantRequest. Có d.Variants → map toàn bộ (dedupe theo
    // SkuId/Name); không thì trả 1 variant từ lựa chọn hiện tại (hành vi cũ).
    private List<UpsertVariantRequest> BuildVariantRequests(
        ExtensionScrapedData d, string variantName, string? translatedName,
        decimal priceCny, List<UpsertPriceTierRequest> offerTiers)
    {
        if (d.Variants is not { Count: > 0 })
        {
            return new List<UpsertVariantRequest>
            {
                new(VariantName:     variantName,
                    TranslatedName:  translatedName,
                    PriceCny:        priceCny,
                    SkuIdOnPlatform: d.SelectedSkuId ?? d.PlatformProductId,
                    StockRaw:        d.Stock,
                    ImageUrl:        d.PrimaryImageUrl,
                    SortOrder:       0,
                    PriceTiers:      offerTiers),
            };
        }

        var list  = new List<UpsertVariantRequest>();
        var seen  = new HashSet<string>(StringComparer.Ordinal);
        var order = 0;
        foreach (var v in d.Variants)
        {
            var name = string.IsNullOrWhiteSpace(v.Name) ? "Default" : v.Name.Trim();
            var sku  = string.IsNullOrWhiteSpace(v.SkuId) ? null : v.SkuId!.Trim();
            var key  = sku ?? name;
            if (!seen.Add(key)) continue;   // trùng SKU/tên → bỏ (tránh tạo variant nhân đôi)

            list.Add(new UpsertVariantRequest(
                VariantName:     name,
                TranslatedName:  string.IsNullOrWhiteSpace(v.NameTranslated) ? null : v.NameTranslated!.Trim(),
                PriceCny:        ConvertToCny(v.PriceOriginal, d.Currency),
                SkuIdOnPlatform: sku,
                StockRaw:        v.Stock,
                ImageUrl:        string.IsNullOrWhiteSpace(v.ImageUrl) ? d.PrimaryImageUrl : v.ImageUrl,
                SortOrder:       order++,
                PriceTiers:      offerTiers));
        }
        return list;
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

    // Có nên cập nhật tên shop hiện tại bằng tên mới scrape được không?
    // Chỉ khi tên mới hợp lệ (không rỗng, không phải fallback "Shop ...") và KHÁC tên cũ.
    public static bool ShouldUpdateShopName(string current, string? incoming)
    {
        if (string.IsNullOrWhiteSpace(incoming)) return false;
        var inc = incoming.Trim();
        if (IsPlaceholderShopName(inc)) return false;
        return !string.Equals(current?.Trim(), inc, StringComparison.Ordinal);
    }

    private static bool IsPlaceholderShopName(string name) =>
        name.StartsWith("Shop ", StringComparison.OrdinalIgnoreCase)
        || name.Equals("unknown", StringComparison.OrdinalIgnoreCase);

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
