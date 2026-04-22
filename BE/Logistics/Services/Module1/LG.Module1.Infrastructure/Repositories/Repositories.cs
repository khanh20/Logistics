using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LG.Module1.Infrastructure.Repositories;

// ── ProductCategory ───────────────────────────────────────────────────────────
public class ProductCategoryRepository(Module1DbContext db) : IProductCategoryRepository
{
    public Task<ProductCategory?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductCategories.Include(x => x.Children).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ProductCategory?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        db.ProductCategories.FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant(), ct);

    public Task<List<ProductCategory>> GetAllAsync(bool activeOnly = true, CancellationToken ct = default)
    {
        var q = db.ProductCategories.Include(x => x.Children).AsQueryable();
        if (activeOnly) q = q.Where(x => x.IsActive);
        return q.OrderBy(x => x.SortOrder).ToListAsync(ct);
    }

    public Task<List<ProductCategory>> GetChildrenAsync(Guid? parentId, CancellationToken ct = default) =>
        db.ProductCategories.Where(x => x.ParentId == parentId && x.IsActive)
                            .OrderBy(x => x.SortOrder).ToListAsync(ct);

    public async Task AddAsync(ProductCategory c, CancellationToken ct = default) =>
        await db.ProductCategories.AddAsync(c, ct);

    public Task UpdateAsync(ProductCategory c, CancellationToken ct = default)
    {
        db.ProductCategories.Update(c);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ProductCategory c, CancellationToken ct = default)
    {
        db.ProductCategories.Remove(c);
        return Task.CompletedTask;
    }
}

// ── ForbiddenCategory ─────────────────────────────────────────────────────────
public class ForbiddenCategoryRepository(Module1DbContext db) : IForbiddenCategoryRepository
{
    public Task<List<ForbiddenCategory>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.ForbiddenCategories.Where(x => x.IsActive).ToListAsync(ct);

    public Task<ForbiddenCategory?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ForbiddenCategories.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(ForbiddenCategory c, CancellationToken ct = default) =>
        await db.ForbiddenCategories.AddAsync(c, ct);

    public Task UpdateAsync(ForbiddenCategory c, CancellationToken ct = default)
    {
        db.ForbiddenCategories.Update(c);
        return Task.CompletedTask;
    }
}

// ── CancelReason ──────────────────────────────────────────────────────────────
public class CancelReasonRepository(Module1DbContext db) : ICancelReasonRepository
{
    public Task<List<CancelReason>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.CancelReasons.Where(x => x.IsActive).ToListAsync(ct);

    public Task<CancelReason?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.CancelReasons.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(CancelReason r, CancellationToken ct = default) =>
        await db.CancelReasons.AddAsync(r, ct);
}

// ── DepositConfig ─────────────────────────────────────────────────────────────
public class DepositConfigRepository(Module1DbContext db) : IDepositConfigRepository
{
    public Task<DepositConfig?> GetActiveForCustomerAsync(Guid? vipTierId, CancellationToken ct = default)
    {
        // Ưu tiên config theo VIP tier, fallback sang "All"
        return db.DepositConfigs
            .Where(x => x.IsActive)
            .OrderByDescending(x => x.VipTierId != null)
            .FirstOrDefaultAsync(x => x.IsActive &&
                (x.VipTierId == vipTierId || x.VipTierId == null), ct);
    }

    public Task<List<DepositConfig>> GetAllAsync(CancellationToken ct = default) =>
        db.DepositConfigs.OrderByDescending(x => x.IsActive).ToListAsync(ct);

    public Task<DepositConfig?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.DepositConfigs.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(DepositConfig c, CancellationToken ct = default) =>
        await db.DepositConfigs.AddAsync(c, ct);

    public Task UpdateAsync(DepositConfig c, CancellationToken ct = default)
    {
        db.DepositConfigs.Update(c);
        return Task.CompletedTask;
    }
}

// ── ExchangeRateHistory ───────────────────────────────────────────────────────
public class ExchangeRateHistoryRepository(Module1DbContext db) : IExchangeRateHistoryRepository
{
    public Task<ExchangeRateHistory?> GetCurrentAsync(CancellationToken ct = default) =>
        db.ExchangeRateHistories.FirstOrDefaultAsync(x => x.IsCurrent, ct);

    public Task<List<ExchangeRateHistory>> GetHistoryAsync(int limit = 30, CancellationToken ct = default) =>
        db.ExchangeRateHistories.OrderByDescending(x => x.EffectiveFrom)
                                .Take(limit).ToListAsync(ct);

    public async Task AddAsync(ExchangeRateHistory r, CancellationToken ct = default) =>
        await db.ExchangeRateHistories.AddAsync(r, ct);

    public Task UpdateAsync(ExchangeRateHistory r, CancellationToken ct = default)
    {
        db.ExchangeRateHistories.Update(r);
        return Task.CompletedTask;
    }
}

// ── Platform ──────────────────────────────────────────────────────────────────
public class PlatformRepository(Module1DbContext db) : IPlatformRepository
{
    public Task<Platform?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Platforms.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<Platform>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.Platforms.Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync(ct);

    public Task<List<Platform>> GetByApiProviderAsync(ApiProvider provider, CancellationToken ct = default) =>
        db.Platforms.Where(x => x.IsActive && x.ApiProvider == provider).ToListAsync(ct);

    public async Task AddAsync(Platform p, CancellationToken ct = default) =>
        await db.Platforms.AddAsync(p, ct);

    public Task UpdateAsync(Platform p, CancellationToken ct = default)
    {
        db.Platforms.Update(p);
        return Task.CompletedTask;
    }
}

// ── PlatformShop ──────────────────────────────────────────────────────────────
public class PlatformShopRepository(Module1DbContext db) : IPlatformShopRepository
{
    public Task<PlatformShop?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.PlatformShops.Include(x => x.Platform).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<PlatformShop?> GetByExternalIdAsync(Guid platformId, string shopId, CancellationToken ct = default) =>
        db.PlatformShops.FirstOrDefaultAsync(x => x.PlatformId == platformId && x.ShopIdOnPlatform == shopId, ct);

    public Task<List<PlatformShop>> GetByPlatformAsync(Guid platformId, CancellationToken ct = default) =>
        db.PlatformShops.Where(x => x.PlatformId == platformId).ToListAsync(ct);

    public async Task AddAsync(PlatformShop s, CancellationToken ct = default) =>
        await db.PlatformShops.AddAsync(s, ct);

    public Task UpdateAsync(PlatformShop s, CancellationToken ct = default)
    {
        db.PlatformShops.Update(s);
        return Task.CompletedTask;
    }
}

// ── PlatformAccount ───────────────────────────────────────────────────────────
public class PlatformAccountRepository(Module1DbContext db) : IPlatformAccountRepository
{
    public Task<PlatformAccount?> GetAvailableAccountAsync(Guid platformId, decimal requiredAmount, CancellationToken ct = default) =>
        db.PlatformAccounts
          .Where(x => x.PlatformId == platformId && x.IsActive && !x.IsFrozen
                      && (x.DailySpentToday + requiredAmount) <= x.DailySpendLimit)
          .OrderBy(x => x.DailySpentToday)  // ít dùng nhất trước
          .FirstOrDefaultAsync(ct);

    public Task<List<PlatformAccount>> GetByPlatformAsync(Guid platformId, CancellationToken ct = default) =>
        db.PlatformAccounts.Where(x => x.PlatformId == platformId).ToListAsync(ct);

    public async Task AddAsync(PlatformAccount a, CancellationToken ct = default) =>
        await db.PlatformAccounts.AddAsync(a, ct);

    public Task UpdateAsync(PlatformAccount a, CancellationToken ct = default)
    {
        db.PlatformAccounts.Update(a);
        return Task.CompletedTask;
    }
}

// ── Product ───────────────────────────────────────────────────────────────────
public class ProductRepository(Module1DbContext db) : IProductRepository
{
    public Task<ProductMaster?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductMasters.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ProductMaster?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default) =>
        db.ProductMasters
          .Include(x => x.Shop).ThenInclude(s => s.Platform)
          .Include(x => x.Category)
          .Include(x => x.ForbiddenCategory)
          .Include(x => x.Images.OrderBy(i => i.SortOrder))
          .Include(x => x.Attributes.OrderBy(a => a.SortOrder))
          .Include(x => x.Variants.OrderBy(v => v.SortOrder))
              .ThenInclude(v => v.PriceTiers.OrderBy(t => t.MinQuantity))
          .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ProductMaster?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        db.ProductMasters
          .Include(x => x.Shop).ThenInclude(s => s.Platform)
          .Include(x => x.Category)
          .Include(x => x.Images.OrderBy(i => i.SortOrder))
          .Include(x => x.Variants.OrderBy(v => v.SortOrder))
              .ThenInclude(v => v.PriceTiers.OrderBy(t => t.MinQuantity))
          .FirstOrDefaultAsync(x => x.Slug == slug.ToLowerInvariant() && x.IsActive, ct);

    public Task<ProductMaster?> GetByPlatformProductIdAsync(Guid platformId, string platformProductId, CancellationToken ct = default) =>
        db.ProductMasters
          .Include(x => x.Shop)
          .FirstOrDefaultAsync(x => x.Shop.PlatformId == platformId
                                    && x.PlatformProductId == platformProductId, ct);

    public async Task<(List<ProductMaster> Items, int TotalCount)> SearchAsync(
        string? keyword, Guid? categoryId, Guid? platformId,
        decimal? minPriceCny, decimal? maxPriceCny,
        bool activeOnly, int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.ProductMasters
                  .Include(x => x.Shop).ThenInclude(s => s.Platform)
                  .Include(x => x.Category)
                  .Include(x => x.Images.Where(i => i.IsPrimary))
                  .Include(x => x.Variants.OrderBy(v => v.PriceCnyCurrent).Take(1))
                  .AsQueryable();

        if (activeOnly) q = q.Where(x => x.IsActive && !x.IsForbidden);
        if (categoryId.HasValue) q = q.Where(x => x.CategoryId == categoryId);
        if (platformId.HasValue) q = q.Where(x => x.Shop.PlatformId == platformId);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            q = q.Where(x => EF.Functions.ILike(x.OriginalTitle, $"%{kw}%")
                           || EF.Functions.ILike(x.TranslatedTitle!, $"%{kw}%"));
        }

        if (minPriceCny.HasValue)
            q = q.Where(x => x.Variants.Any(v => v.PriceCnyCurrent >= minPriceCny.Value));
        if (maxPriceCny.HasValue)
            q = q.Where(x => x.Variants.Any(v => v.PriceCnyCurrent <= maxPriceCny.Value));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.IsFeatured)
                           .ThenByDescending(x => x.ViewCount)
                           .Skip((page - 1) * pageSize)
                           .Take(pageSize)
                           .ToListAsync(ct);

        return (items, total);
    }

    public Task<List<ProductMaster>> GetFeaturedAsync(int limit, CancellationToken ct = default) =>
        db.ProductMasters
          .Where(x => x.IsActive && x.IsFeatured && !x.IsForbidden)
          .Include(x => x.Images.Where(i => i.IsPrimary))
          .Include(x => x.Variants.OrderBy(v => v.PriceCnyCurrent).Take(1))
          .OrderByDescending(x => x.ViewCount)
          .Take(limit).ToListAsync(ct);

    public async Task AddAsync(ProductMaster p, CancellationToken ct = default) =>
        await db.ProductMasters.AddAsync(p, ct);

    public Task UpdateAsync(ProductMaster p, CancellationToken ct = default)
    {
        db.ProductMasters.Update(p);
        return Task.CompletedTask;
    }
}

// ── ProductVariant ────────────────────────────────────────────────────────────
public class ProductVariantRepository(Module1DbContext db) : IProductVariantRepository
{
    public Task<ProductVariant?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductVariants.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ProductVariant?> GetByIdWithTiersAsync(Guid id, CancellationToken ct = default) =>
        db.ProductVariants
          .Include(x => x.PriceTiers.OrderBy(t => t.MinQuantity))
          .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ProductVariant>> GetByProductAsync(Guid productId, CancellationToken ct = default) =>
        db.ProductVariants
          .Include(x => x.PriceTiers.OrderBy(t => t.MinQuantity))
          .Where(x => x.ProductId == productId)
          .OrderBy(x => x.SortOrder)
          .ToListAsync(ct);

    public async Task AddAsync(ProductVariant v, CancellationToken ct = default) =>
        await db.ProductVariants.AddAsync(v, ct);

    public async Task AddRangeAsync(IEnumerable<ProductVariant> variants, CancellationToken ct = default) =>
        await db.ProductVariants.AddRangeAsync(variants, ct);

    public Task UpdateAsync(ProductVariant v, CancellationToken ct = default)
    {
        db.ProductVariants.Update(v);
        return Task.CompletedTask;
    }

    public async Task RemoveByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var variants = await db.ProductVariants.Where(x => x.ProductId == productId).ToListAsync(ct);
        db.ProductVariants.RemoveRange(variants);
    }
}

// ── ProductPriceTier ──────────────────────────────────────────────────────────
public class ProductPriceTierRepository(Module1DbContext db) : IProductPriceTierRepository
{
    public Task<List<ProductPriceTier>> GetByVariantAsync(Guid variantId, CancellationToken ct = default) =>
        db.ProductPriceTiers.Where(x => x.VariantId == variantId)
                            .OrderBy(x => x.MinQuantity).ToListAsync(ct);

    public async Task AddRangeAsync(IEnumerable<ProductPriceTier> tiers, CancellationToken ct = default) =>
        await db.ProductPriceTiers.AddRangeAsync(tiers, ct);

    public async Task RemoveByVariantAsync(Guid variantId, CancellationToken ct = default)
    {
        var tiers = await db.ProductPriceTiers.Where(x => x.VariantId == variantId).ToListAsync(ct);
        db.ProductPriceTiers.RemoveRange(tiers);
    }
}

// ── ProductImage ──────────────────────────────────────────────────────────────
public class ProductImageRepository(Module1DbContext db) : IProductImageRepository
{
    public Task<List<ProductImage>> GetByProductAsync(Guid productId, CancellationToken ct = default) =>
        db.ProductImages.Where(x => x.ProductId == productId)
                        .OrderBy(x => x.SortOrder).ToListAsync(ct);

    public async Task AddRangeAsync(IEnumerable<ProductImage> images, CancellationToken ct = default) =>
        await db.ProductImages.AddRangeAsync(images, ct);

    public Task UpdateAsync(ProductImage img, CancellationToken ct = default)
    {
        db.ProductImages.Update(img);
        return Task.CompletedTask;
    }

    public async Task RemoveByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var imgs = await db.ProductImages.Where(x => x.ProductId == productId).ToListAsync(ct);
        db.ProductImages.RemoveRange(imgs);
    }
}

// ── UnitOfWork ────────────────────────────────────────────────────────────────
public class Module1UnitOfWork(Module1DbContext db) : IModule1UnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try   { await action(ct); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await action(ct);
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return result;
            }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }
}
