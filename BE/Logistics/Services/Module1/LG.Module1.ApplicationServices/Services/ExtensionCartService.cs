using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Adapters.Common;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// Nhận raw scraped payload từ Chrome Extension, lookup/upsert Platform → Shop → Product → Variant
// rồi add vào Cart của customer trong 1 transaction.
// Reuse pattern từ ProductIngestionService + CartService.
public class ExtensionCartService(
    IPlatformRepository             platformRepo,
    IPlatformShopRepository         shopRepo,
    IProductCategoryRepository      categoryRepo,
    IProductService                 productService,
    ICartRepository                 cartRepo,
    ICartItemRepository             cartItemRepo,
    IExtensionScrapeLogRepository   scrapeLogRepo,
    IModule1UnitOfWork              uow,
    ILogger<ExtensionCartService>   logger
) : IExtensionCartService
{
    public async Task<AddFromExtensionResponse> AddAsync(Guid customerId,
        AddFromExtensionRequest req, CancellationToken ct = default)
    {
        {
            // 1. Normalize + lookup Platform
            var platformName = NormalizePlatformName(req.Platform);
            var platforms    = await platformRepo.GetAllActiveAsync(ct);
            var platform     = platforms.FirstOrDefault(p =>
                p.Name.Equals(platformName, StringComparison.OrdinalIgnoreCase))
                ?? throw new PlatformNotFoundException(platformName);

            // 2. Upsert PlatformShop. Auto-create lần đầu gặp.
            var shop = await shopRepo.GetByExternalIdAsync(platform.Id, req.ShopIdOnPlatform, ct);
            if (shop is null)
            {
                shop = PlatformShop.Create(platform.Id, req.ShopIdOnPlatform, req.ShopName, req.ShopUrl);
                await shopRepo.AddAsync(shop, ct);
                await uow.SaveChangesAsync(ct);
                logger.LogInformation("Auto-created shop from extension: {Name} ({ExtId}) on {Platform}",
                    shop.ShopName, shop.ShopIdOnPlatform, platform.Name);
            }
            if (shop.IsBlacklisted)
                throw new BlacklistedShopException(shop.ShopName);

            // 3. Resolve category — fallback category đầu tiên nếu user không chọn
            var categoryId = req.CategoryId
                ?? (await categoryRepo.GetAllAsync(activeOnly: true, ct)).First().Id;

            // 4. Convert giá → CNY (currency có thể là CNY/JPY tùy sàn)
            var priceSource = req.PricePromotion ?? req.PriceOriginal;
            var priceCny    = ConvertToCny(priceSource, req.Currency);

            // 5. Tên variant — fallback "Default" nếu user không chọn variant trên sàn
            var variantName = string.IsNullOrWhiteSpace(req.PropertiesOriginal)
                ? "Default"
                : req.PropertiesOriginal!.Trim();
            var translatedName = string.IsNullOrWhiteSpace(req.PropertiesTranslated)
                ? null
                : req.PropertiesTranslated!.Trim();

            // 6. Dedupe + build images
            var imageList = new List<string>();
            if (!string.IsNullOrWhiteSpace(req.PrimaryImageUrl))
                imageList.Add(req.PrimaryImageUrl);
            if (req.ImageUrls is not null)
                imageList.AddRange(req.ImageUrls.Where(u =>
                    !string.IsNullOrWhiteSpace(u) && !imageList.Contains(u)));

            var images = imageList.Select((url, idx) => new UpsertImageRequest(
                SourceUrl: url,
                IsPrimary: idx == 0,
                SortOrder: idx,
                SourceUrlHash: HashHelper.ComputeUrlHash(url))).ToList();

            // 7. Build price tiers (1688 có bậc giá theo số lượng)
            var tiers = (req.PriceTiers ?? new List<ExtensionPriceTierDto>())
                .Select(t => new UpsertPriceTierRequest(
                    MinQuantity: t.MinQuantity,
                    MaxQuantity: t.MaxQuantity,
                    PriceCny:    ConvertToCny(t.PriceOriginal, req.Currency)))
                .ToList();

            // 8. Build UpsertProductRequest — reuse productService.UpsertFromRawAsync
            var slug = SlugHelper.GenerateSlug(
                req.TitleTranslated ?? req.TitleOriginal,
                req.PlatformProductId);

            var upsertReq = new UpsertProductRequest(
                ShopId:            shop.Id,
                CategoryId:        categoryId,
                PlatformProductId: req.PlatformProductId,
                OriginalTitle:     req.TitleOriginal,
                Slug:              slug,
                OriginalUrl:       req.OriginalUrl,
                TranslatedTitle:   req.TitleTranslated,
                SeoDescription:    null,
                CrawlTaskId:       null,
                Variants: new List<UpsertVariantRequest>
                {
                    new(VariantName:     variantName,
                        TranslatedName:  translatedName,
                        PriceCny:        priceCny,
                        SkuIdOnPlatform: req.SelectedSkuId ?? req.PlatformProductId,
                        StockRaw:        req.Stock,
                        ImageUrl:        req.PrimaryImageUrl,
                        SortOrder:       0,
                        PriceTiers:      tiers),
                },
                Images:     images,
                Attributes: new List<UpsertAttributeRequest>());

            var savedProduct = await productService.UpsertFromRawAsync(upsertReq, ct);

            if (savedProduct.IsForbidden)
                throw new ForbiddenProductException(
                    savedProduct.OriginalTitle,
                    savedProduct.ForbiddenReason ?? "không xác định");

            // 9. Match variant vừa upsert (theo VariantName) — fallback variant đầu tiên
            var matchedVariant = savedProduct.Variants.FirstOrDefault(v => v.VariantName == variantName)
                              ?? savedProduct.Variants.First();

            // 10. Add to cart
            var cart = await cartRepo.GetActiveByCustomerAsync(customerId, ct);
            if (cart is null)
            {
                cart = Cart.CreateForCustomer(customerId);
                await cartRepo.AddAsync(cart, ct);
                await uow.SaveChangesAsync(ct);
            }

            var existingItem = cart.Items.FirstOrDefault(i => i.VariantId == matchedVariant.Id);
            var isMerge      = existingItem is not null;

            var primaryImage = savedProduct.Images.FirstOrDefault(i => i.IsPrimary)?.Url
                            ?? savedProduct.Images.FirstOrDefault()?.Url;

            var cartItem = cart.AddOrUpdateItem(
                productId:        savedProduct.Id,
                variantId:        matchedVariant.Id,
                shopId:           shop.Id,
                quantity:         req.Quantity,
                priceCnySnapshot: matchedVariant.PriceCnyCurrent,
                productTitle:     savedProduct.TranslatedTitle ?? savedProduct.OriginalTitle,
                variantName:      matchedVariant.TranslatedName ?? matchedVariant.VariantName,
                imageUrl:         matchedVariant.ImageUrl ?? primaryImage);

            if (!isMerge)
                await cartItemRepo.AddAsync(cartItem, ct);
            await cartRepo.UpdateAsync(cart, ct);

            // 11. Log scrape
            try
            {
                await scrapeLogRepo.AddAsync(ExtensionScrapeLog.Create(
                    customerId, req.Platform, req.PlatformProductId, req.OriginalUrl,
                    req.ExtensionVersion, success: true,
                    confidenceTier: req.ConfidenceTier), ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to write ExtensionScrapeLog — non-fatal");
            }

            await uow.SaveChangesAsync(ct);

            var subtotalCny = cart.Items.Sum(i => i.Quantity * i.PriceCnySnapshot);

            logger.LogInformation(
                "Extension add-to-cart: customer={CustomerId}, platform={Platform}, productId={ProductId}, status={Status}",
                customerId, req.Platform, savedProduct.Id, isMerge ? "MergedQuantity" : "Added");

            return new AddFromExtensionResponse(
                CartItemId:         cartItem.Id,
                ProductId:          savedProduct.Id,
                VariantId:          matchedVariant.Id,
                ProductTitle:       savedProduct.TranslatedTitle ?? savedProduct.OriginalTitle,
                PriceCnySnapshot:   cartItem.PriceCnySnapshot,
                Quantity:           cartItem.Quantity,
                CartTotalItemCount: cart.Items.Count,
                CartSubtotalCny:    subtotalCny,
                Status:             isMerge ? "MergedQuantity" : "Added");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Map giá trị frontend "TAOBAO" / "TMALL" / "1688" / "RAKUTEN" → tên đúng trong DB.
    private static string NormalizePlatformName(string p) => p.Trim().ToUpperInvariant() switch
    {
        "TAOBAO"  => "Taobao",
        "TMALL"   => "Tmall",
        "1688"    => "1688",
        "RAKUTEN" => "Rakuten",
        _         => p.Trim(),
    };

    // Convert giá → CNY (catalog dùng CNY làm đơn vị chuẩn).
    private static decimal ConvertToCny(decimal price, string currency)
    {
        var rate = currency.Trim().ToUpperInvariant() switch
        {
            "CNY" => 1m,
            "USD" => 7.2m,
            "JPY" => 0.048m,    // 1 JPY ≈ 0.048 CNY
            "EUR" => 7.8m,
            "GBP" => 9.1m,
            "VND" => 0.000295m,
            _     => 1m,
        };
        return Math.Round(price * rate, 2);
    }
}
