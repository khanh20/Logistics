using LG.Module1.ApplicationServices.DTOs.Category;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// ── ProductCategoryService ────────────────────────────────────────────────────
public class ProductCategoryService(
    IProductCategoryRepository repo,
    IModule1UnitOfWork uow,
    ILogger<ProductCategoryService> logger
) : IProductCategoryService
{
    public async Task<List<CategoryTreeResponse>> GetTreeAsync(CancellationToken ct = default)
    {
        var roots = await repo.GetChildrenAsync(null, ct);
        return roots.Select(LookupMapper.ToCategoryTree).ToList();
    }

    public async Task<CategoryTreeResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var cat = await repo.GetByIdAsync(id, ct)
                  ?? throw new ProductNotFoundException(id);
        return LookupMapper.ToCategoryTree(cat);
    }

    public async Task<CategoryTreeResponse> CreateAsync(CreateCategoryRequest req, CancellationToken ct = default)
    {
        if (await repo.GetBySlugAsync(req.Slug, ct) is not null)
            throw new InvalidOperationException($"Slug '{req.Slug}' đã tồn tại.");

        var cat = ProductCategory.Create(req.NameVn, req.Slug, req.NameCn, req.ParentId, req.IconUrl, req.SortOrder);
        await repo.AddAsync(cat, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Category created: {Slug}", cat.Slug);
        return LookupMapper.ToCategoryTree(cat);
    }

    public async Task<CategoryTreeResponse> UpdateAsync(Guid id, UpdateCategoryRequest req, CancellationToken ct = default)
    {
        var cat = await repo.GetByIdAsync(id, ct)
                  ?? throw new ProductNotFoundException(id);

        cat.Update(req.NameVn, req.NameCn, req.Slug, req.SortOrder, req.IsActive);
        await repo.UpdateAsync(cat, ct);
        await uow.SaveChangesAsync(ct);

        return LookupMapper.ToCategoryTree(cat);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var cat = await repo.GetByIdAsync(id, ct)
                  ?? throw new ProductNotFoundException(id);

        if (cat.Children.Any())
            throw new InvalidOperationException("Không thể xóa danh mục đang có danh mục con.");

        await repo.DeleteAsync(cat, ct);
        await uow.SaveChangesAsync(ct);
    }
}

// ── ForbiddenCategoryService ──────────────────────────────────────────────────
public class ForbiddenCategoryService(
    IForbiddenCategoryRepository repo,
    IModule1UnitOfWork uow,
    ILogger<ForbiddenCategoryService> logger
) : IForbiddenCategoryService
{
    public async Task<List<ForbiddenCategoryResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await repo.GetAllActiveAsync(ct);
        return list.Select(LookupMapper.ToForbiddenResponse).ToList();
    }

    public async Task<ForbiddenCategoryResponse> CreateAsync(CreateForbiddenCategoryRequest req, Guid adminId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<ForbiddenSeverity>(req.Severity, ignoreCase: true, out var severity))
            throw new ArgumentException($"Severity không hợp lệ: {req.Severity}");

        var cat = ForbiddenCategory.Create(req.Name, req.Reason, req.KeywordsCn, req.KeywordsVn, severity, adminId);
        await repo.AddAsync(cat, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("ForbiddenCategory created: {Name} by {Admin}", cat.Name, adminId);
        return LookupMapper.ToForbiddenResponse(cat);
    }

    public async Task<ForbiddenCategoryResponse> UpdateAsync(Guid id, CreateForbiddenCategoryRequest req, CancellationToken ct = default)
    {
        var cat = await repo.GetByIdAsync(id, ct)
                  ?? throw new ProductNotFoundException(id);

        if (!Enum.TryParse<ForbiddenSeverity>(req.Severity, ignoreCase: true, out var severity))
            throw new ArgumentException($"Severity không hợp lệ: {req.Severity}");

        cat.Update(req.Name, req.Reason, req.KeywordsCn, req.KeywordsVn, severity, true);
        await repo.UpdateAsync(cat, ct);
        await uow.SaveChangesAsync(ct);

        return LookupMapper.ToForbiddenResponse(cat);
    }

    public async Task<(bool IsForbidden, Guid? CategoryId, string? CategoryName)>
        CheckTitleAsync(string title, CancellationToken ct = default)
    {
        var allActive = await repo.GetAllActiveAsync(ct);
        var match = allActive.FirstOrDefault(c => c.MatchesTitle(title));
        return match is null
            ? (false, null, null)
            : (true, match.Id, match.Name);
    }
}

// ── ExchangeRateService ───────────────────────────────────────────────────────
public class ExchangeRateService(
    IExchangeRateHistoryRepository repo,
    IModule1UnitOfWork uow,
    ILogger<ExchangeRateService> logger
) : IExchangeRateService
{
    public async Task<ExchangeRateResponse> GetCurrentAsync(CancellationToken ct = default)
    {
        var rate = await repo.GetCurrentAsync(ct)
                   ?? throw new InvalidOperationException("Chưa có tỉ giá nào được cấu hình.");
        return LookupMapper.ToRateResponse(rate);
    }

    public async Task<List<ExchangeRateResponse>> GetHistoryAsync(int limit = 30, CancellationToken ct = default)
    {
        var list = await repo.GetHistoryAsync(limit, ct);
        return list.Select(LookupMapper.ToRateResponse).ToList();
    }

    public async Task<ExchangeRateResponse> UpdateAsync(UpdateExchangeRateRequest req, Guid adminId, CancellationToken ct = default)
    {
        var newRate = await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var current = await repo.GetCurrentAsync(innerCt);
            if (current is not null)
            {
                current.Deactivate(DateTime.UtcNow);
                await repo.UpdateAsync(current, innerCt);
            }

            var created = ExchangeRateHistory.Create(req.RateVndPerCny, req.Source, DateTime.UtcNow, adminId);
            await repo.AddAsync(created, innerCt);

            return created;
        }, ct);

        logger.LogInformation("Exchange rate updated: {Rate} VND/CNY by {Admin}", req.RateVndPerCny, adminId);
        return LookupMapper.ToRateResponse(newRate);
    }
}

// ── DepositConfigService ──────────────────────────────────────────────────────
public class DepositConfigService(IDepositConfigRepository repo) : IDepositConfigService
{
    public async Task<List<DepositConfigResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await repo.GetAllAsync(ct);
        return list.Select(LookupMapper.ToDepositResponse).ToList();
    }

    public async Task<DepositConfigResponse> GetActiveForCustomerAsync(Guid? vipTierId, CancellationToken ct = default)
    {
        var cfg = await repo.GetActiveForCustomerAsync(vipTierId, ct)
                  ?? throw new InvalidOperationException("Chưa có cấu hình cọc nào được kích hoạt.");
        return LookupMapper.ToDepositResponse(cfg);
    }
}

// ── ProductService ────────────────────────────────────────────────────────────
public class ProductService(
    IProductRepository productRepo,
    IProductVariantRepository variantRepo,
    IProductPriceTierRepository tierRepo,
    IProductImageRepository imageRepo,
    IForbiddenCategoryService forbiddenSvc,
    IModule1UnitOfWork uow,
    ILogger<ProductService> logger
) : IProductService
{
    public async Task<PagedProductResponse> SearchAsync(ProductSearchRequest req, CancellationToken ct = default)
    {
        var (items, total) = await productRepo.SearchAsync(
            req.Keyword, req.CategoryId, req.PlatformId,
            req.MinPriceCny, req.MaxPriceCny,
            req.ActiveOnly, req.Page, req.PageSize, ct);

        return new PagedProductResponse(
            items.Select(ProductMapper.ToListItem).ToList(),
            req.Page, req.PageSize, total,
            (int)Math.Ceiling(total / (double)req.PageSize)
        );
    }

    public async Task<ProductDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdWithDetailsAsync(id, ct)
                      ?? throw new ProductNotFoundException(id);
        return ProductMapper.ToDetail(product);
    }

    public async Task<ProductDetailResponse> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var product = await productRepo.GetBySlugAsync(slug, ct)
                      ?? throw new ProductNotFoundException(slug);
        return ProductMapper.ToDetail(product);
    }

    public async Task<List<ProductListItemResponse>> GetFeaturedAsync(int limit = 10, CancellationToken ct = default)
    {
        var list = await productRepo.GetFeaturedAsync(limit, ct);
        return list.Select(ProductMapper.ToListItem).ToList();
    }

    public async Task<ProductDetailResponse> UpsertFromRawAsync(UpsertProductRequest req, CancellationToken ct = default)
    {

        if (string.IsNullOrWhiteSpace(req.OriginalTitle))
            throw new ArgumentException("OriginalTitle is required.");

        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var existing = await productRepo.GetByPlatformProductIdAsync(
                req.ShopId, req.PlatformProductId, innerCt);

            ProductMaster product;
            bool isNew = existing is null;

            if (isNew)
            {
                product = ProductMaster.Create(
                    req.ShopId, req.CategoryId, req.PlatformProductId,
                    req.OriginalTitle, req.Slug, req.OriginalUrl,
                    req.TranslatedTitle, req.CrawlTaskId);
                await productRepo.AddAsync(product, innerCt);
                await uow.SaveChangesAsync(innerCt);
            }
            else
            {
                product = existing!;
            }

            if (req.TranslatedTitle is not null)
                product.SetTranslation(req.TranslatedTitle, req.SeoDescription);

            var (isForbidden, catId, catName) =
                await forbiddenSvc.CheckTitleAsync(req.OriginalTitle, innerCt);

            if (isForbidden && catId.HasValue)
            {
                product.MarkAsForbidden(catId.Value);
                logger.LogWarning("Product flagged as forbidden: {Title} → {Category}",
                    req.OriginalTitle, catName);
            }
            else if (product.IsForbidden)
            {
                product.ClearForbiddenFlag();
            }

            await productRepo.UpdateAsync(product, innerCt);

            if (req.Variants?.Count > 0)
            {
                // Xóa variants cũ trước — cần flush để FK constraint không bị conflict
                await variantRepo.RemoveByProductAsync(product.Id, innerCt);
                await uow.SaveChangesAsync(innerCt);   // flush delete trước khi add mới

                foreach (var vReq in req.Variants)
                {
                    var variant = ProductVariant.Create(
                        product.Id, vReq.VariantName, vReq.PriceCny,
                        vReq.SkuIdOnPlatform, vReq.TranslatedName,
                        vReq.StockRaw, vReq.ImageUrl, vReq.SortOrder);
                    await variantRepo.AddAsync(variant, innerCt);

                    if (vReq.PriceTiers?.Count > 0)
                    {
                        await uow.SaveChangesAsync(innerCt);

                        var tiers = vReq.PriceTiers
                            .Select(t => ProductPriceTier.Create(
                                variant.Id, t.MinQuantity, t.PriceCny, t.MaxQuantity))
                            .ToList();
                        await tierRepo.AddRangeAsync(tiers, innerCt);
                        variant.UpdatePrice(vReq.PriceCny, tiers);
                    }
                }
            }

            if (req.Images?.Count > 0)
            {
                await imageRepo.RemoveByProductAsync(product.Id, innerCt);
                var images = req.Images
                    .Select(i => ProductImage.Create(
                        product.Id, i.SourceUrl, i.IsPrimary, i.SortOrder, i.SourceUrlHash))
                    .ToList();
                await imageRepo.AddRangeAsync(images, innerCt);
            }

            product.RecordPriceSync();
            await productRepo.UpdateAsync(product, innerCt);

            logger.LogInformation("{Action} product: {Title} (Id: {Id})",
                isNew ? "Created" : "Updated", product.OriginalTitle, product.Id);

            await uow.SaveChangesAsync(innerCt);   
            var full = await productRepo.GetByIdWithDetailsAsync(product.Id, innerCt)
                       ?? throw new ProductNotFoundException(product.Id);

            return ProductMapper.ToDetail(full);
        }, ct);
    }

    public async Task<ProductDetailResponse> SetFeaturedAsync(Guid id, bool featured, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdAsync(id, ct)
                      ?? throw new ProductNotFoundException(id);
        product.SetFeatured(featured);
        await productRepo.UpdateAsync(product, ct);
        await uow.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeactivateAsync(Guid id, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdAsync(id, ct)
                      ?? throw new ProductNotFoundException(id);
        product.Deactivate();
        await productRepo.UpdateAsync(product, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task IncrementViewAsync(Guid id, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdAsync(id, ct);
        if (product is null) return;   // không throw cho fire-and-forget call
        product.IncrementView();
        await productRepo.UpdateAsync(product, ct);
        await uow.SaveChangesAsync(ct);
    }
}