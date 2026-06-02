using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Ingestion;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// Nhận raw scraped payload từ Chrome Extension → upsert Product (qua ExtensionProductUpserter)
// rồi add vào Cart của customer.
public class ExtensionCartService(
    ExtensionProductUpserter        upserter,
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
            // 1-9. Upsert Platform→Shop→Product→Variant (logic dùng chung với resolve-url)
            var scraped = new ExtensionScrapedData(
                Platform:             req.Platform,
                PlatformProductId:    req.PlatformProductId,
                ShopIdOnPlatform:     req.ShopIdOnPlatform,
                ShopName:             req.ShopName,
                ShopUrl:              req.ShopUrl,
                TitleOriginal:        req.TitleOriginal,
                TitleTranslated:      req.TitleTranslated,
                PriceOriginal:        req.PriceOriginal,
                PricePromotion:       req.PricePromotion,
                Currency:             req.Currency,
                Stock:                req.Stock,
                PrimaryImageUrl:      req.PrimaryImageUrl,
                ImageUrls:            req.ImageUrls,
                PropertiesTranslated: req.PropertiesTranslated,
                PropertiesOriginal:   req.PropertiesOriginal,
                SelectedSkuId:        req.SelectedSkuId,
                PriceTiers:           req.PriceTiers,
                ConfidenceTier:       req.ConfidenceTier);

            var upsert = await upserter.UpsertAsync(scraped, req.CategoryId, req.OriginalUrl, ct);

            if (upsert.IsForbidden)
                throw new ForbiddenProductException(
                    upsert.Product.OriginalTitle,
                    upsert.ForbiddenReason ?? "không xác định");

            var savedProduct   = upsert.Product;
            var matchedVariant = savedProduct.Variants.First(v => v.Id == upsert.MatchedVariantId);

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
                shopId:           savedProduct.Shop.Id,
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
}
