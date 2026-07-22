using LG.Module1.ApplicationServices.DTOs.Category;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Caching.Memory;
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
    IEmbeddingProvider embeddingProvider,
    ISearchReranker searchReranker,
    IMemoryCache cache,
    IModule1UnitOfWork uow,
    ILogger<ProductService> logger
) : IProductService
{
    private const int SemanticPoolSize = 50;
    private const int RerankTopK = 50; 
    private static readonly TimeSpan SemanticPoolTtl = TimeSpan.FromMinutes(2);

    public async Task<PagedProductResponse> SearchAsync(ProductSearchRequest req, CancellationToken ct = default)
    {
        // Semantic chỉ khi khách không chọn sort cụ thể và trang nằm trong pool;
        // ngoài phạm vi đó dùng lexical để Sort + phân trang sâu hoạt động như cũ.
        var useSemantic = req.Semantic
            && !string.IsNullOrWhiteSpace(req.Keyword)
            && req.Sort == ProductSort.Relevance
            && req.Page * req.PageSize <= SemanticPoolSize;
        if (useSemantic)
            return await SearchSemanticAsync(req, ct);

        var (items, total) = await productRepo.SearchAsync(
            req.Keyword, req.CategoryId, req.PlatformId,
            req.MinPriceCny, req.MaxPriceCny,
            req.ActiveOnly, req.Sort, req.Page, req.PageSize, ct);

        return new PagedProductResponse(
            items.Select(ProductMapper.ToListItem).ToList(),
            req.Page, req.PageSize, total,
            (int)Math.Ceiling(total / (double)req.PageSize)
        );
    }

    // Hybrid (lexical + vector, RRF) → cross-encoder rerank. Pool đã xếp hạng được CACHE
    // theo (keyword + bộ lọc) nên phân trang / tìm lại cùng truy vấn không chạy lại embed+rerank.
    private async Task<PagedProductResponse> SearchSemanticAsync(ProductSearchRequest req, CancellationToken ct)
    {
        var key = SemanticCacheKey(req);
        if (!cache.TryGetValue(key, out (List<ProductListItemResponse> Items, int Total) pool))
        {
            pool = await ComputeSemanticPoolAsync(req, ct);
            cache.Set(key, pool, SemanticPoolTtl);
        }

        var pageItems = pool.Items
            .Skip((req.Page - 1) * req.PageSize)
            .Take(req.PageSize)
            .ToList();

        return new PagedProductResponse(
            pageItems, req.Page, req.PageSize, pool.Total,
            (int)Math.Ceiling(pool.Total / (double)req.PageSize));
    }

    // Tính pool ngữ nghĩa (embed → hybrid RRF → rerank) rồi map DTO. Chỉ chạy 1 lần/truy vấn (được cache).
    private async Task<(List<ProductListItemResponse> Items, int Total)> ComputeSemanticPoolAsync(
        ProductSearchRequest req, CancellationToken ct)
    {
        Pgvector.Vector? qVec = null;
        try
        {
            var emb = await embeddingProvider.EmbedAsync(req.Keyword!, ct);
            if (emb.Length > 0) qVec = new Pgvector.Vector(emb);
        }
        catch (Exception ex) { logger.LogWarning(ex, "Embed query lỗi — tìm kiếm lexical-only."); }

        var (candidates, lexTotal) = await productRepo.SearchHybridAsync(
            req.Keyword, req.CategoryId, req.PlatformId,
            req.MinPriceCny, req.MaxPriceCny, req.ActiveOnly, qVec, SemanticPoolSize, ct);

        var total = Math.Max(lexTotal, candidates.Count);
        if (candidates.Count == 0) return (new(), total);

        var docs = candidates.Take(RerankTopK).Select(p => (p.Id, Text: BuildRerankText(p))).ToList();
        var order = await searchReranker.RerankAsync(req.Keyword!, docs, ct);
        if (order is not null)
            candidates = Common.RankingHelpers.ReorderByIds(candidates, order);

        return (candidates.Select(ProductMapper.ToListItem).ToList(), total);
    }

    private static string SemanticCacheKey(ProductSearchRequest req) =>
        $"sem:{req.Keyword?.Trim().ToLowerInvariant()}|c={req.CategoryId}|p={req.PlatformId}|" +
        $"mn={req.MinPriceCny}|mx={req.MaxPriceCny}|a={req.ActiveOnly}";

    private static string BuildRerankText(ProductMaster p)
    {
        var title = string.IsNullOrWhiteSpace(p.TranslatedTitle) ? p.OriginalTitle : p.TranslatedTitle!;
        if (title.Length > 80) title = title[..80];   // chặn độ dài để cross-encoder CPU ổn định
        var cat = p.Category?.NameVn;
        return string.IsNullOrWhiteSpace(cat) ? title : $"{title} · {cat}";
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
                // Upsert variants — KHÔNG xóa cứng vì cart_items có FK tới product_variants.
                // Variants không còn trong list mới → MarkUnavailable (soft delete).
                var existingVariants = await variantRepo.GetByProductAsync(product.Id, innerCt);

                foreach (var vReq in req.Variants)
                {
                    // Ưu tiên match theo SkuIdOnPlatform, fallback VariantName
                    var match = existingVariants.FirstOrDefault(v =>
                                    !string.IsNullOrEmpty(vReq.SkuIdOnPlatform)
                                    && v.SkuIdOnPlatform == vReq.SkuIdOnPlatform)
                                ?? existingVariants.FirstOrDefault(v =>
                                    v.VariantName == vReq.VariantName);

                    if (match is not null)
                    {
                        // Update in-place — giữ nguyên Id, không mất FK từ cart_items
                        match.UpdateInfo(vReq.VariantName, vReq.TranslatedName, vReq.ImageUrl, vReq.SortOrder);
                        match.UpdatePrice(vReq.PriceCny);
                        if (vReq.StockRaw.HasValue)
                            match.UpdateStock(vReq.StockRaw.Value, true);
                        else
                            match.MarkAvailable();

                        // Refresh price tiers
                        await tierRepo.RemoveByVariantAsync(match.Id, innerCt);
                        await uow.SaveChangesAsync(innerCt);

                        if (vReq.PriceTiers?.Count > 0)
                        {
                            var tiers = vReq.PriceTiers
                                .Select(t => ProductPriceTier.Create(match.Id, t.MinQuantity, t.PriceCny, t.MaxQuantity))
                                .ToList();
                            await tierRepo.AddRangeAsync(tiers, innerCt);
                            match.UpdatePrice(vReq.PriceCny, tiers);
                        }

                        await variantRepo.UpdateAsync(match, innerCt);
                    }
                    else
                    {
                        // New variant
                        var variant = ProductVariant.Create(
                            product.Id, vReq.VariantName, vReq.PriceCny,
                            vReq.SkuIdOnPlatform, vReq.TranslatedName,
                            vReq.StockRaw, vReq.ImageUrl, vReq.SortOrder);
                        await variantRepo.AddAsync(variant, innerCt);

                        if (vReq.PriceTiers?.Count > 0)
                        {
                            await uow.SaveChangesAsync(innerCt);
                            var tiers = vReq.PriceTiers
                                .Select(t => ProductPriceTier.Create(variant.Id, t.MinQuantity, t.PriceCny, t.MaxQuantity))
                                .ToList();
                            await tierRepo.AddRangeAsync(tiers, innerCt);
                            variant.UpdatePrice(vReq.PriceCny, tiers);
                        }
                    }
                }

                // Variants không còn trong request → mark unavailable (giữ FK, ẩn khỏi catalog)
                var incomingSkus   = req.Variants.Where(v => !string.IsNullOrEmpty(v.SkuIdOnPlatform))
                                                 .Select(v => v.SkuIdOnPlatform!).ToHashSet();
                var incomingNames  = req.Variants.Select(v => v.VariantName).ToHashSet();
                foreach (var old in existingVariants)
                {
                    bool stillPresent = (!string.IsNullOrEmpty(old.SkuIdOnPlatform) && incomingSkus.Contains(old.SkuIdOnPlatform))
                                        || incomingNames.Contains(old.VariantName);
                    if (!stillPresent && old.IsAvailable)
                    {
                        old.MarkUnavailable();
                        await variantRepo.UpdateAsync(old, innerCt);
                    }
                }
            }

            if (req.Images?.Count > 0)
            {
                // Giữ LocalCdnUrl đã upload theo SourceUrlHash, tránh mất khi re-crawl
                var oldCdnByHash = (await imageRepo.GetByProductAsync(product.Id, innerCt))
                    .Where(e => !string.IsNullOrEmpty(e.SourceUrlHash) && !string.IsNullOrEmpty(e.LocalCdnUrl))
                    .GroupBy(e => e.SourceUrlHash!)
                    .ToDictionary(g => g.Key, g => g.First().LocalCdnUrl!);

                await imageRepo.RemoveByProductAsync(product.Id, innerCt);
                var images = req.Images
                    .Select(i =>
                    {
                        var img = ProductImage.Create(product.Id, i.SourceUrl, i.IsPrimary, i.SortOrder, i.SourceUrlHash);
                        if (!string.IsNullOrEmpty(i.SourceUrlHash) && oldCdnByHash.TryGetValue(i.SourceUrlHash, out var cdn))
                            img.SetLocalCdnUrl(cdn);
                        return img;
                    })
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

    public async Task<ProductDetailResponse> GetDetailForAdminAsync(Guid id, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdWithDetailsAsync(id, ct)
                      ?? throw new ProductNotFoundException(id);
        return ProductMapper.ToDetail(product);
    }

    public async Task<ProductDetailResponse> UpdateInfoAsync(Guid id, UpdateProductInfoRequest req, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdWithDetailsAsync(id, ct)
                      ?? throw new ProductNotFoundException(id);

        product.SetTranslation(req.TranslatedTitle ?? string.Empty, req.SeoDescription);
        product.SetCategory(req.CategoryId);

        await productRepo.UpdateAsync(product, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Product info updated by admin: {ProductId}", id);

        // Reload để trả response đầy đủ với navigation props
        return await GetDetailForAdminAsync(id, ct);
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