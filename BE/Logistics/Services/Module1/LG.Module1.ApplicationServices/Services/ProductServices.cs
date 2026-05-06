using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// ─── ProductVariantService ────────────────────────────────────────────────────
public class ProductVariantService(
    IProductVariantRepository variantRepo,
    IProductPriceTierRepository tierRepo,
    IProductRepository productRepo,
    IModule1UnitOfWork uow,
    ILogger<ProductVariantService> logger
) : IProductVariantService
{
    public async Task<List<ProductVariantResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default)
    {
        _ = await productRepo.GetByIdAsync(productId, ct)
            ?? throw new ProductNotFoundException(productId);

        var variants = await variantRepo.GetByProductAsync(productId, ct);
        return variants.Select(ProductMapper.ToVariant).ToList();
    }

    public async Task<ProductVariantResponse> GetByIdAsync(Guid variantId, CancellationToken ct = default)
    {
        var variant = await variantRepo.GetByIdWithTiersAsync(variantId, ct)
                      ?? throw new ProductNotFoundException(variantId);
        return ProductMapper.ToVariant(variant);
    }

    public async Task<ProductVariantResponse> AddAsync(Guid productId, AddVariantRequest req, CancellationToken ct = default)
    {
        _ = await productRepo.GetByIdAsync(productId, ct)
            ?? throw new ProductNotFoundException(productId);

        var variant = ProductVariant.Create(
            productId, req.VariantName, req.PriceCny,
            req.SkuIdOnPlatform, req.TranslatedName,
            req.StockRaw, req.ImageUrl, req.SortOrder);

        await variantRepo.AddAsync(variant, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Variant added to product {ProductId}: {VariantName}", productId, req.VariantName);
        return ProductMapper.ToVariant(variant);
    }

    public async Task<ProductVariantResponse> UpdateAsync(Guid variantId, UpdateVariantRequest req, CancellationToken ct = default)
    {
        var variant = await variantRepo.GetByIdWithTiersAsync(variantId, ct)
                      ?? throw new ProductNotFoundException(variantId);

        variant.UpdateInfo(req.VariantName, req.TranslatedName, req.ImageUrl, req.SortOrder);
        variant.UpdatePrice(req.PriceCny);
        if (req.StockRaw.HasValue)
            variant.UpdateStock(req.StockRaw.Value, req.IsAvailable);

        await variantRepo.UpdateAsync(variant, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Variant updated: {VariantId}", variantId);
        return ProductMapper.ToVariant(variant);
    }

    public async Task DeleteAsync(Guid variantId, CancellationToken ct = default)
    {
        var variant = await variantRepo.GetByIdAsync(variantId, ct)
                      ?? throw new ProductNotFoundException(variantId);

        await variantRepo.DeleteAsync(variant, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Variant deleted: {VariantId}", variantId);
    }

    public async Task<ProductVariantResponse> SyncPriceTiersAsync(Guid variantId, SyncPriceTiersRequest req, CancellationToken ct = default)
    {
        var variant = await variantRepo.GetByIdAsync(variantId, ct)
                      ?? throw new ProductNotFoundException(variantId);

        // Validate tiers trước khi mở transaction
        foreach (var t in req.Tiers)
        {
            if (t.MaxQuantity.HasValue && t.MaxQuantity < t.MinQuantity)
                throw new ArgumentException($"Tier MinQty={t.MinQuantity}: MaxQty phải >= MinQty.");
        }

        // FIX ACID: delete cũ + insert mới trong 1 transaction
        var updated = await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await tierRepo.RemoveByVariantAsync(variantId, innerCt);
            await uow.SaveChangesAsync(innerCt);

            var newTiers = req.Tiers
                .Select(t => ProductPriceTier.Create(variantId, t.MinQuantity, t.PriceCny, t.MaxQuantity))
                .ToList();

            if (newTiers.Count > 0)
                await tierRepo.AddRangeAsync(newTiers, innerCt);

            // Cập nhật PriceCnyMin trên variant
            variant.UpdatePrice(variant.PriceCnyCurrent, newTiers);
            await variantRepo.UpdateAsync(variant, innerCt);

            return newTiers;
        }, ct);

        logger.LogInformation("Price tiers synced for variant {VariantId}: {Count} tiers", variantId, updated.Count);

        // Reload để trả response đầy đủ
        var result = await variantRepo.GetByIdWithTiersAsync(variantId, ct)
                     ?? throw new ProductNotFoundException(variantId);
        return ProductMapper.ToVariant(result);
    }
}

// ─── ProductImageService ──────────────────────────────────────────────────────
public class ProductImageService(
    IProductImageRepository imageRepo,
    IProductRepository productRepo,
    IModule1UnitOfWork uow,
    ILogger<ProductImageService> logger
) : IProductImageService
{
    public async Task<List<ProductImageResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var images = await imageRepo.GetByProductAsync(productId, ct);
        return images.Select(ProductMapper.ToImage).ToList();
    }

    public async Task<ProductImageResponse> AddAsync(Guid productId, AddImageRequest req, CancellationToken ct = default)
    {
        _ = await productRepo.GetByIdAsync(productId, ct)
            ?? throw new ProductNotFoundException(productId);

        // Check trùng SourceUrlHash nếu có
        if (!string.IsNullOrEmpty(req.SourceUrlHash))
        {
            var existing = await imageRepo.GetByProductAsync(productId, ct);
            if (existing.Any(i => i.SourceUrlHash == req.SourceUrlHash))
            {
                // Trả về ảnh đã có thay vì thêm trùng
                var dup = existing.First(i => i.SourceUrlHash == req.SourceUrlHash);
                logger.LogInformation("Duplicate image skipped for product {ProductId}", productId);
                return ProductMapper.ToImage(dup);
            }
        }

        var image = ProductImage.Create(productId, req.SourceUrl, req.IsPrimary, req.SortOrder, req.SourceUrlHash);

        // Nếu là primary, phải bỏ primary của ảnh cũ trong cùng transaction
        if (req.IsPrimary)
        {
            await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                await ClearPrimaryAsync(productId, innerCt);
                await imageRepo.AddAsync(image, innerCt);
            }, ct);
        }
        else
        {
            await imageRepo.AddAsync(image, ct);
            await uow.SaveChangesAsync(ct);
        }

        logger.LogInformation("Image added to product {ProductId}: {Url}", productId, req.SourceUrl);
        return ProductMapper.ToImage(image);
    }

    public async Task<ProductImageResponse> SetCdnUrlAsync(Guid imageId, SetImageCdnRequest req, CancellationToken ct = default)
    {
        var image = await imageRepo.GetByIdAsync(imageId, ct)
                    ?? throw new ProductNotFoundException(imageId);

        image.SetLocalCdnUrl(req.LocalCdnUrl, req.WidthPx, req.HeightPx, req.FileSizeKb);
        await imageRepo.UpdateAsync(image, ct);
        await uow.SaveChangesAsync(ct);

        return ProductMapper.ToImage(image);
    }

    public async Task<ProductImageResponse> SetPrimaryAsync(Guid imageId, CancellationToken ct = default)
    {
        var image = await imageRepo.GetByIdAsync(imageId, ct)
                    ?? throw new ProductNotFoundException(imageId);

        // FIX ACID: bỏ primary cũ + set primary mới trong 1 transaction
        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await ClearPrimaryAsync(image.ProductId, innerCt);
            image.SetAsPrimary();
            await imageRepo.UpdateAsync(image, innerCt);
        }, ct);

        logger.LogInformation("Primary image set: {ImageId} for product {ProductId}", imageId, image.ProductId);
        return ProductMapper.ToImage(image);
    }

    public async Task ReorderAsync(Guid productId, ReorderImagesRequest req, CancellationToken ct = default)
    {
        var images = await imageRepo.GetByProductAsync(productId, ct);
        var imageDict = images.ToDictionary(i => i.Id);

        foreach (var item in req.Items)
        {
            if (!imageDict.TryGetValue(item.Id, out var img)) continue;
            img.SetSortOrder(item.SortOrder);
            await imageRepo.UpdateAsync(img, ct);
        }

        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Images reordered for product {ProductId}", productId);
    }

    public async Task DeleteAsync(Guid imageId, CancellationToken ct = default)
    {
        var image = await imageRepo.GetByIdAsync(imageId, ct)
                    ?? throw new ProductNotFoundException(imageId);

        await imageRepo.DeleteAsync(image, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Image deleted: {ImageId}", imageId);
    }

    // ── Private ───────────────────────────────────────────────────────────────
    private async Task ClearPrimaryAsync(Guid productId, CancellationToken ct)
    {
        var existing = await imageRepo.GetByProductAsync(productId, ct);
        foreach (var img in existing.Where(i => i.IsPrimary))
        {
            img.ClearPrimary();
            await imageRepo.UpdateAsync(img, ct);
        }
    }
}

// ─── ProductAttributeService ──────────────────────────────────────────────────
public class ProductAttributeService(
    IProductAttributeRepository attrRepo,
    IProductRepository productRepo,
    IModule1UnitOfWork uow,
    ILogger<ProductAttributeService> logger
) : IProductAttributeService
{
    public async Task<List<ProductAttributeResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var attrs = await attrRepo.GetByProductAsync(productId, ct);
        return attrs.Select(ProductMapper.ToAttribute).ToList();
    }

    public async Task<ProductAttributeResponse> AddAsync(Guid productId, AddAttributeRequest req, CancellationToken ct = default)
    {
        _ = await productRepo.GetByIdAsync(productId, ct)
            ?? throw new ProductNotFoundException(productId);

        var attr = ProductAttribute.Create(productId, req.KeyCn, req.KeyVn, req.ValueCn, req.ValueVn, req.SortOrder);
        await attrRepo.AddAsync(attr, ct);
        await uow.SaveChangesAsync(ct);

        return ProductMapper.ToAttribute(attr);
    }

    public async Task<ProductAttributeResponse> UpdateAsync(Guid attributeId, AddAttributeRequest req, CancellationToken ct = default)
    {
        var attr = await attrRepo.GetByIdAsync(attributeId, ct)
                   ?? throw new ProductNotFoundException(attributeId);

        attr.Update(req.KeyCn, req.KeyVn, req.ValueCn, req.ValueVn, req.SortOrder);
        await attrRepo.UpdateAsync(attr, ct);
        await uow.SaveChangesAsync(ct);

        return ProductMapper.ToAttribute(attr);
    }

    public async Task DeleteAsync(Guid attributeId, CancellationToken ct = default)
    {
        var attr = await attrRepo.GetByIdAsync(attributeId, ct)
                   ?? throw new ProductNotFoundException(attributeId);

        await attrRepo.DeleteAsync(attr, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task<List<ProductAttributeResponse>> SyncAsync(Guid productId, List<AddAttributeRequest> attributes, CancellationToken ct = default)
    {
        _ = await productRepo.GetByIdAsync(productId, ct)
            ?? throw new ProductNotFoundException(productId);

        // FIX ACID: delete tất cả cũ + insert mới trong 1 transaction
        var result = await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await attrRepo.RemoveByProductAsync(productId, innerCt);
            await uow.SaveChangesAsync(innerCt);

            var newAttrs = attributes
                .Select(r => ProductAttribute.Create(productId, r.KeyCn, r.KeyVn, r.ValueCn, r.ValueVn, r.SortOrder))
                .ToList();

            if (newAttrs.Count > 0)
                await attrRepo.AddRangeAsync(newAttrs, innerCt);

            return newAttrs;
        }, ct);

        logger.LogInformation("Attributes synced for product {ProductId}: {Count} attrs", productId, result.Count);
        return result.Select(ProductMapper.ToAttribute).ToList();
    }
}