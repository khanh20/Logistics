using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using LG.Module1.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

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

    public Task<List<Platform>> GetAllAsync(CancellationToken ct = default) =>
        db.Platforms
          .Include(x => x.Shops)
          .Include(x => x.Accounts)
          .OrderBy(x => x.Name).ToListAsync(ct);

    public Task<List<Platform>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.Platforms
          .Include(x => x.Shops)
          .Include(x => x.Accounts)
          .Where(x => x.IsActive)
          .OrderBy(x => x.Name).ToListAsync(ct);

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
    public Task<PlatformAccount?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.PlatformAccounts.Include(a => a.Platform)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

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

    public Task<ProductMaster?> GetByPlatformProductIdAsync(Guid shopId, string platformProductId, CancellationToken ct = default) =>
        db.ProductMasters
          .FirstOrDefaultAsync(x => x.ShopId == shopId
                                    && x.PlatformProductId == platformProductId, ct);

    public Task<ProductMaster?> GetByPlatformAndProductIdAsync(Guid platformId, string platformProductId, CancellationToken ct = default) =>
        db.ProductMasters
          .Where(x => x.Shop.PlatformId == platformId && x.PlatformProductId == platformProductId)
          .OrderByDescending(x => x.IsActive)   // ưu tiên bản đang active nếu trùng id
          .FirstOrDefaultAsync(ct);

    public async Task<(List<ProductMaster> Items, int TotalCount)> SearchAsync(
        string? keyword, Guid? categoryId, Guid? platformId,
        decimal? minPriceCny, decimal? maxPriceCny,
        bool activeOnly, ProductSort sort, int page, int pageSize, CancellationToken ct = default)
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

        // Sắp xếp theo lựa chọn của khách; mặc định giữ hành vi cũ (nổi bật → lượt xem).
        IOrderedQueryable<ProductMaster> ordered = sort switch
        {
            ProductSort.PriceAsc    => q.OrderBy(x => x.Variants.Min(v => (decimal?)v.PriceCnyCurrent)),
            ProductSort.PriceDesc   => q.OrderByDescending(x => x.Variants.Max(v => (decimal?)v.PriceCnyCurrent)),
            ProductSort.Newest      => q.OrderByDescending(x => x.CreatedAt),
            ProductSort.BestSelling => q.OrderByDescending(x => x.TotalSoldLocal),
            ProductSort.MostViewed  => q.OrderByDescending(x => x.ViewCount),
            _                       => q.OrderByDescending(x => x.IsFeatured).ThenByDescending(x => x.ViewCount),
        };

        var items = await ordered
                           .Skip((page - 1) * pageSize)
                           .Take(pageSize)
                           .ToListAsync(ct);

        return (items, total);
    }

    public Task<List<ProductMaster>> GetFeaturedAsync(int limit, CancellationToken ct = default) =>
        db.ProductMasters
          .Where(x => x.IsActive && x.IsFeatured && !x.IsForbidden)
          .Include(x => x.Shop).ThenInclude(s => s.Platform)
          .Include(x => x.Images.Where(i => i.IsPrimary))
          .Include(x => x.Variants.OrderBy(v => v.PriceCnyCurrent).Take(1))
          .OrderByDescending(x => x.ViewCount)
          .Take(limit).ToListAsync(ct);

    public async Task<List<ProductMaster>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return new();
        return await db.ProductMasters
            .Where(x => idList.Contains(x.Id) && x.IsActive && !x.IsForbidden)
            .Include(x => x.Shop).ThenInclude(s => s.Platform)
            .Include(x => x.Images.Where(i => i.IsPrimary))
            .Include(x => x.Variants.OrderBy(v => v.PriceCnyCurrent).Take(1))
            .ToListAsync(ct);
    }

    public async Task<List<ProductMaster>> GetTopByCategoriesAsync(
        IEnumerable<Guid> categoryIds, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default)
    {
        var cats = categoryIds.Distinct().ToList();
        if (cats.Count == 0) return new();
        var exclude = excludeIds.Distinct().ToList();
        return await db.ProductMasters
            .Where(x => x.IsActive && !x.IsForbidden && cats.Contains(x.CategoryId) && !exclude.Contains(x.Id))
            .Include(x => x.Shop).ThenInclude(s => s.Platform)
            .Include(x => x.Images.Where(i => i.IsPrimary))
            .Include(x => x.Variants.OrderBy(v => v.PriceCnyCurrent).Take(1))
            .OrderByDescending(x => x.IsFeatured).ThenByDescending(x => x.ViewCount)
            .Take(limit).ToListAsync(ct);
    }

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

    public Task DeleteAsync(ProductVariant v, CancellationToken ct = default)
    {
        db.ProductVariants.Remove(v);
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
    public Task<ProductPriceTier?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductPriceTiers.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ProductPriceTier>> GetByVariantAsync(Guid variantId, CancellationToken ct = default) =>
        db.ProductPriceTiers.Where(x => x.VariantId == variantId)
                            .OrderBy(x => x.MinQuantity).ToListAsync(ct);
    public async Task AddAsync(ProductPriceTier tier, CancellationToken ct = default) =>
        await db.ProductPriceTiers.AddAsync(tier, ct);

    public async Task AddRangeAsync(IEnumerable<ProductPriceTier> tiers, CancellationToken ct = default) =>
        await db.ProductPriceTiers.AddRangeAsync(tiers, ct);
    public Task UpdateAsync(ProductPriceTier tier, CancellationToken ct = default)
    {
        db.ProductPriceTiers.Update(tier);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ProductPriceTier tier, CancellationToken ct = default)
    {
        db.ProductPriceTiers.Remove(tier);
        return Task.CompletedTask;
    }

    public async Task RemoveByVariantAsync(Guid variantId, CancellationToken ct = default)
    {
        var tiers = await db.ProductPriceTiers.Where(x => x.VariantId == variantId).ToListAsync(ct);
        db.ProductPriceTiers.RemoveRange(tiers);
    }
}

// ── ProductImage ──────────────────────────────────────────────────────────────
public class ProductImageRepository(Module1DbContext db) : IProductImageRepository
{
    public Task<ProductImage?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductImages.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ProductImage>> GetByProductAsync(Guid productId, CancellationToken ct = default) =>
        db.ProductImages.Where(x => x.ProductId == productId)
                        .OrderBy(x => x.SortOrder).ToListAsync(ct);
    public async Task AddAsync(ProductImage image, CancellationToken ct = default) =>
        await db.ProductImages.AddAsync(image, ct);

    public async Task AddRangeAsync(IEnumerable<ProductImage> images, CancellationToken ct = default) =>
        await db.ProductImages.AddRangeAsync(images, ct);

    public Task UpdateAsync(ProductImage img, CancellationToken ct = default)
    {
        db.ProductImages.Update(img);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ProductImage img, CancellationToken ct = default)
    {
        db.ProductImages.Remove(img);
        return Task.CompletedTask;
    }

    public async Task RemoveByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var imgs = await db.ProductImages.Where(x => x.ProductId == productId).ToListAsync(ct);
        db.ProductImages.RemoveRange(imgs);
    }
}

// ── ProductAttribute ──────────────────────────────────────────────────────────
public class ProductAttributeRepository(Module1DbContext db) : IProductAttributeRepository
{
    public Task<ProductAttribute?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductAttributes.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<ProductAttribute>> GetByProductAsync(Guid productId, CancellationToken ct = default) =>
        db.ProductAttributes.Where(x => x.ProductId == productId)
                            .OrderBy(x => x.SortOrder).ToListAsync(ct);

    public async Task AddAsync(ProductAttribute a, CancellationToken ct = default) =>
        await db.ProductAttributes.AddAsync(a, ct);

    public async Task AddRangeAsync(IEnumerable<ProductAttribute> attributes, CancellationToken ct = default) =>
        await db.ProductAttributes.AddRangeAsync(attributes, ct);

    public Task UpdateAsync(ProductAttribute a, CancellationToken ct = default)
    {
        db.ProductAttributes.Update(a);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ProductAttribute a, CancellationToken ct = default)
    {
        db.ProductAttributes.Remove(a);
        return Task.CompletedTask;
    }

    public async Task RemoveByProductAsync(Guid productId, CancellationToken ct = default)
    {
        var attrs = await db.ProductAttributes.Where(x => x.ProductId == productId).ToListAsync(ct);
        db.ProductAttributes.RemoveRange(attrs);
    }
}

// ── Cart ──────────────────────────────────────────────────────────────────────
public class CartRepository(Module1DbContext db) : ICartRepository
{
    public Task<Cart?> GetActiveByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.Carts
          .Include(c => c.Items).ThenInclude(i => i.Shop)
          .FirstOrDefaultAsync(c => c.CustomerId == customerId && c.Status == CartStatus.Active, ct);

    public Task<Cart?> GetByIdAsync(Guid cartId, CancellationToken ct = default) =>
        db.Carts
          .Include(c => c.Items).ThenInclude(i => i.Shop)
          .FirstOrDefaultAsync(c => c.Id == cartId, ct);

    public async Task AddAsync(Cart cart, CancellationToken ct = default) =>
        await db.Carts.AddAsync(cart, ct);
 
    public Task UpdateAsync(Cart cart, CancellationToken ct = default)
    {
        if (db.Entry(cart).State == EntityState.Detached)
            db.Carts.Update(cart);
        return Task.CompletedTask;
    }

    public Task<List<CartItem>> GetItemsByIdsAsync(Guid cartId, IEnumerable<Guid> itemIds, CancellationToken ct = default)
    {
        var ids = itemIds.ToList();
        return db.CartItems.Where(i => i.CartId == cartId && ids.Contains(i.Id)).ToListAsync(ct);
    }
}

// ── CartItem ──────────────────────────────────────────────────────────────────
public class CartItemRepository(Module1DbContext db) : ICartItemRepository
{
    public async Task AddAsync(CartItem item, CancellationToken ct = default)
    {
        if (db.Entry(item).State == EntityState.Detached)
            await db.CartItems.AddAsync(item, ct);
    }

    public Task DeleteAsync(CartItem item, CancellationToken ct = default)
    {
        db.CartItems.Remove(item);
        return Task.CompletedTask;
    }

    public Task DeleteRangeAsync(IEnumerable<CartItem> items, CancellationToken ct = default)
    {
        db.CartItems.RemoveRange(items);
        return Task.CompletedTask;
    }
}

// ── CustomerOrder ─────────────────────────────────────────────────────────────
public class CustomerOrderRepository(Module1DbContext db) : ICustomerOrderRepository
{
    public Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.CustomerOrders.FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<CustomerOrder?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default) =>
        db.CustomerOrders
          .Include(o => o.Items)
          .Include(o => o.History.OrderByDescending(h => h.ChangedAt))
          .Include(o => o.PlatformOrder)
          .Include(o => o.Fees)
          .FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<CustomerOrder?> GetByOrderCodeAsync(string orderCode, CancellationToken ct = default) =>
        db.CustomerOrders
          .Include(o => o.Items)
          .FirstOrDefaultAsync(o => o.OrderCode == orderCode, ct);

    public async Task<(List<CustomerOrder> Items, int TotalCount)> SearchAsync(
        Guid? customerId, Guid? assignedStaffId, OrderStatus? status,
        DateTime? fromDate, DateTime? toDate,
        int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.CustomerOrders.AsQueryable();

        if (customerId.HasValue)      q = q.Where(o => o.CustomerId == customerId);
        if (assignedStaffId.HasValue) q = q.Where(o => o.AssignedStaffId == assignedStaffId);
        if (status.HasValue)          q = q.Where(o => o.Status == status);
        if (fromDate.HasValue)        q = q.Where(o => o.CreatedAt >= fromDate);
        if (toDate.HasValue)          q = q.Where(o => o.CreatedAt <= toDate);

        var total = await q.CountAsync(ct);
        var items = await q
            .Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<List<CustomerOrder>> GetUnassignedPaidOrdersAsync(int take, CancellationToken ct = default) =>
        db.CustomerOrders
          .Where(o => o.Status == OrderStatus.Paid && o.AssignedStaffId == null)
          .OrderBy(o => o.PaidAt)
          .Take(take)
          .ToListAsync(ct);

    public Task<int> CountCompletedByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.CustomerOrders.CountAsync(o => o.CustomerId == customerId && o.Status == OrderStatus.Completed, ct);

    public async Task<List<Guid>> GetPurchasedProductIdsAsync(Guid customerId, int limit, CancellationToken ct = default)
    {
        // OrderItem giữ VariantId → map sang ProductId qua ProductVariants.
        var variantIds = await db.CustomerOrders
            .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Completed)
            .SelectMany(o => o.Items.Select(i => i.VariantId))
            .Distinct()
            .Take(limit * 4)
            .ToListAsync(ct);
        if (variantIds.Count == 0) return new();

        return await db.ProductVariants
            .Where(v => variantIds.Contains(v.Id))
            .Select(v => v.ProductId)
            .Distinct()
            .Take(limit)
            .ToListAsync(ct);
    }

    public Task<List<Guid>> GetPurchasedShopIdsAsync(Guid customerId, CancellationToken ct = default) =>
        db.CustomerOrders
          .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Completed)
          .Select(o => o.ShopId)
          .Distinct()
          .ToListAsync(ct);

    public Task<bool> HasPurchasedProductAsync(Guid customerId, Guid productId, CancellationToken ct = default) =>
        db.CustomerOrders
          .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Completed)
          .SelectMany(o => o.Items)
          .Join(db.ProductVariants, i => i.VariantId, v => v.Id, (i, v) => v.ProductId)
          .AnyAsync(pid => pid == productId, ct);

    public Task<List<CustomerOrder>> GetTimedOutPendingOrdersAsync(int timeoutMinutes, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return db.CustomerOrders
                 .Where(o => o.Status == OrderStatus.PendingPayment && o.PaymentDeadline < now)
                 .ToListAsync(ct);
    }

    public async Task AddAsync(CustomerOrder order, CancellationToken ct = default) =>
        await db.CustomerOrders.AddAsync(order, ct);

    public Task UpdateAsync(CustomerOrder order, CancellationToken ct = default)
    {
        if (db.Entry(order).State == EntityState.Detached)
            db.CustomerOrders.Update(order);
        return Task.CompletedTask;
    }
}

// ── OrderStatusHistory ────────────────────────────────────────────────────────
public class OrderStatusHistoryRepository(Module1DbContext db) : IOrderStatusHistoryRepository
{
    public async Task AddAsync(OrderStatusHistory entry, CancellationToken ct = default)
    {
        if (db.Entry(entry).State == EntityState.Detached)
            await db.OrderStatusHistories.AddAsync(entry, ct);
    }
}

// ── PlatformOrder ─────────────────────────────────────────────────────────────
public class PlatformOrderRepository(Module1DbContext db) : IPlatformOrderRepository
{
    public Task<PlatformOrder?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.PlatformOrders.FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<PlatformOrder?> GetByCustomerOrderAsync(Guid customerOrderId, CancellationToken ct = default) =>
        db.PlatformOrders.FirstOrDefaultAsync(o => o.CustomerOrderId == customerOrderId, ct);

    public Task<List<PlatformOrder>> GetByStaffAsync(Guid staffId, OrderStatus? status,
        int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.PlatformOrders
                  .Include(o => o.CustomerOrder)
                  .Where(o => o.CreatedByStaff == staffId);

        if (status.HasValue)
            q = q.Where(o => o.CustomerOrder.Status == status);

        return q.OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);
    }

    public async Task AddAsync(PlatformOrder order, CancellationToken ct = default) =>
        await db.PlatformOrders.AddAsync(order, ct);

    public Task UpdateAsync(PlatformOrder order, CancellationToken ct = default)
    {
        db.PlatformOrders.Update(order);
        return Task.CompletedTask;
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

// ── StaffAssignment ───────────────────────────────────────────────────────────
public class StaffAssignmentRepository(Module1DbContext db) : IStaffAssignmentRepository
{
    public Task<StaffAssignment?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.StaffAssignments.Include(x => x.Order).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<StaffAssignment?> GetActiveByOrderIdAsync(Guid orderId, CancellationToken ct = default) =>
        // Query trực tiếp trên FK column orderId — không qua navigation (tránh Bug 3)
        db.StaffAssignments
          .Where(x => x.OrderId == orderId && x.CompletedAt == null)
          .OrderByDescending(x => x.AssignedAt)
          .FirstOrDefaultAsync(ct);

    public Task<List<StaffAssignment>> GetAllByOrderIdAsync(Guid orderId, CancellationToken ct = default) =>
        db.StaffAssignments
          .Where(x => x.OrderId == orderId)
          .OrderByDescending(x => x.AssignedAt)
          .ToListAsync(ct);

    public Task<List<StaffAssignment>> GetByStaffIdAsync(Guid staffId, bool activeOnly,
                                                          CancellationToken ct = default)
    {
        var q = db.StaffAssignments.Where(x => x.StaffId == staffId);
        if (activeOnly) q = q.Where(x => x.CompletedAt == null);
        return q.OrderByDescending(x => x.AssignedAt).ToListAsync(ct);
    }

    public Task<List<StaffAssignment>> GetOverdueAsync(CancellationToken ct = default) =>
        db.StaffAssignments
          .Where(x => x.IsOverdue && x.CompletedAt == null)
          .Include(x => x.Order)
          .OrderBy(x => x.SlaDeadline)
          .ToListAsync(ct);

    public Task<List<StaffAssignment>> GetPendingExpiredAsync(CancellationToken ct = default) =>
        // Lấy những assignment chưa complete, chưa đánh dấu overdue, nhưng đã qua deadline
        db.StaffAssignments
          .Where(x => x.CompletedAt == null && !x.IsOverdue && x.SlaDeadline < DateTime.UtcNow)
          .ToListAsync(ct);

    public Task<int> GetActiveLoadAsync(Guid staffId, CancellationToken ct = default) =>
        db.StaffAssignments.CountAsync(x => x.StaffId == staffId && x.CompletedAt == null, ct);

    public Task<int> GetOverdueCountAsync(Guid staffId, CancellationToken ct = default) =>
        db.StaffAssignments.CountAsync(x => x.StaffId == staffId && x.IsOverdue && x.CompletedAt == null, ct);

    public Task<List<StaffAssignment>> GetQueueByStaffAsync(Guid staffId, bool includeClosed,
                                                            CancellationToken ct = default)
    {
        var q = db.StaffAssignments.Include(x => x.Order).Where(x => x.StaffId == staffId);
        if (!includeClosed) q = q.Where(x => x.CompletedAt == null);
        return q.OrderBy(x => x.CompletedAt == null ? 0 : 1)
                .ThenBy(x => x.SlaDeadline)
                .ToListAsync(ct);
    }

    public Task<List<StaffAssignment>> GetAssignedBetweenAsync(DateTime fromUtc, DateTime toUtc,
                                                               CancellationToken ct = default) =>
        db.StaffAssignments
          .Where(x => x.AssignedAt >= fromUtc && x.AssignedAt < toUtc)
          .ToListAsync(ct);

    public async Task AddAsync(StaffAssignment assignment, CancellationToken ct = default)
    {
        // Tránh Bug 1 (EF snapshot): chỉ Add khi entry Detached
        if (db.Entry(assignment).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            await db.StaffAssignments.AddAsync(assignment, ct);
    }

    public Task UpdateAsync(StaffAssignment assignment, CancellationToken ct = default)
    {
        if (db.Entry(assignment).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            db.StaffAssignments.Update(assignment);
        return Task.CompletedTask;
    }
}

// ── ExtensionScrapeLog ────────────────────────────────────────────────────────
public class ExtensionScrapeLogRepository(Module1DbContext db) : IExtensionScrapeLogRepository
{
    public async Task AddAsync(ExtensionScrapeLog log, CancellationToken ct = default)
    {
        if (db.Entry(log).State == EntityState.Detached)
            await db.ExtensionScrapeLogs.AddAsync(log, ct);
    }
}

// ── StaffWorkSetting ──────────────────────────────────────────────────────────
public class StaffWorkSettingRepository(Module1DbContext db) : IStaffWorkSettingRepository
{
    public Task<StaffWorkSetting?> GetByStaffIdAsync(Guid staffId, CancellationToken ct = default) =>
        db.StaffWorkSettings.FirstOrDefaultAsync(x => x.StaffId == staffId, ct);

    public Task<List<StaffWorkSetting>> GetAllAsync(CancellationToken ct = default) =>
        db.StaffWorkSettings.ToListAsync(ct);

    public Task<List<StaffWorkSetting>> GetByStaffIdsAsync(IEnumerable<Guid> staffIds, CancellationToken ct = default)
    {
        var ids = staffIds.ToList();
        return db.StaffWorkSettings.Where(x => ids.Contains(x.StaffId)).ToListAsync(ct);
    }

    public async Task AddAsync(StaffWorkSetting setting, CancellationToken ct = default)
    {
        if (db.Entry(setting).State == EntityState.Detached)
            await db.StaffWorkSettings.AddAsync(setting, ct);
    }

    public Task UpdateAsync(StaffWorkSetting setting, CancellationToken ct = default)
    {
        if (db.Entry(setting).State == EntityState.Detached)
            db.StaffWorkSettings.Update(setting);
        return Task.CompletedTask;
    }
}

// ── StaffPerformanceDaily ─────────────────────────────────────────────────────
public class StaffPerformanceRepository(Module1DbContext db) : IStaffPerformanceRepository
{
    public Task<StaffPerformanceDaily?> GetAsync(Guid staffId, DateOnly date, CancellationToken ct = default) =>
        db.StaffPerformanceDailies.FirstOrDefaultAsync(x => x.StaffId == staffId && x.Date == date, ct);

    public Task<List<StaffPerformanceDaily>> GetRangeAsync(Guid? staffId, DateOnly from, DateOnly to,
                                                           CancellationToken ct = default)
    {
        var q = db.StaffPerformanceDailies.Where(x => x.Date >= from && x.Date <= to);
        if (staffId.HasValue) q = q.Where(x => x.StaffId == staffId.Value);
        return q.OrderBy(x => x.Date).ToListAsync(ct);
    }

    public async Task AddAsync(StaffPerformanceDaily snapshot, CancellationToken ct = default)
    {
        if (db.Entry(snapshot).State == EntityState.Detached)
            await db.StaffPerformanceDailies.AddAsync(snapshot, ct);
    }

    public Task UpdateAsync(StaffPerformanceDaily snapshot, CancellationToken ct = default)
    {
        if (db.Entry(snapshot).State == EntityState.Detached)
            db.StaffPerformanceDailies.Update(snapshot);
        return Task.CompletedTask;
    }
}

// ── StaffNotification ─────────────────────────────────────────────────────────
public class StaffNotificationRepository(Module1DbContext db) : IStaffNotificationRepository
{
    public Task<List<StaffNotification>> GetByStaffAsync(Guid staffId, bool unreadOnly, int take,
                                                         CancellationToken ct = default)
    {
        var q = db.StaffNotifications.Where(x => x.StaffId == staffId);
        if (unreadOnly) q = q.Where(x => !x.IsRead);
        return q.OrderByDescending(x => x.CreatedAt).Take(take).ToListAsync(ct);
    }

    public Task<int> CountUnreadAsync(Guid staffId, CancellationToken ct = default) =>
        db.StaffNotifications.CountAsync(x => x.StaffId == staffId && !x.IsRead, ct);

    public Task<StaffNotification?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.StaffNotifications.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task MarkAllReadAsync(Guid staffId, CancellationToken ct = default) =>
        await db.StaffNotifications
            .Where(x => x.StaffId == staffId && !x.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsRead, true), ct);

    public async Task AddAsync(StaffNotification notification, CancellationToken ct = default)
    {
        if (db.Entry(notification).State == EntityState.Detached)
            await db.StaffNotifications.AddAsync(notification, ct);
    }

    public Task UpdateAsync(StaffNotification notification, CancellationToken ct = default)
    {
        if (db.Entry(notification).State == EntityState.Detached)
            db.StaffNotifications.Update(notification);
        return Task.CompletedTask;
    }
}

// ── OrderComplaint ────────────────────────────────────────────────────────────
public class OrderComplaintRepository(Module1DbContext db) : IOrderComplaintRepository
{
    public Task<OrderComplaint?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.OrderComplaints.Include(x => x.Order).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<OrderComplaint>> GetByOrderAsync(Guid orderId, CancellationToken ct = default) =>
        db.OrderComplaints.Where(x => x.OrderId == orderId)
                          .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<(List<OrderComplaint> Items, int TotalCount)> SearchAsync(
        ComplaintStatus? status, Guid? assignedToStaffId, Guid? customerId,
        int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.OrderComplaints.Include(x => x.Order).AsQueryable();
        if (status.HasValue)            q = q.Where(x => x.Status == status);
        if (assignedToStaffId.HasValue) q = q.Where(x => x.AssignedToStaffId == assignedToStaffId);
        if (customerId.HasValue)        q = q.Where(x => x.CustomerId == customerId);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.CreatedAt)
                           .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task AddAsync(OrderComplaint complaint, CancellationToken ct = default)
    {
        if (db.Entry(complaint).State == EntityState.Detached)
            await db.OrderComplaints.AddAsync(complaint, ct);
    }

    public Task UpdateAsync(OrderComplaint complaint, CancellationToken ct = default)
    {
        if (db.Entry(complaint).State == EntityState.Detached)
            db.OrderComplaints.Update(complaint);
        return Task.CompletedTask;
    }
}

// ── SupplierChatLog ───────────────────────────────────────────────────────────
public class SupplierChatLogRepository(Module1DbContext db) : ISupplierChatLogRepository
{
    public Task<List<SupplierChatLog>> GetByOrderAsync(Guid orderId, CancellationToken ct = default) =>
        db.SupplierChatLogs.Where(x => x.OrderId == orderId)
                           .OrderBy(x => x.SentAt).ToListAsync(ct);

    public async Task AddAsync(SupplierChatLog log, CancellationToken ct = default)
    {
        if (db.Entry(log).State == EntityState.Detached)
            await db.SupplierChatLogs.AddAsync(log, ct);
    }
}

// ── Engagement / Recommendation (Plan C) ─────────────────────────────────────
public class UserActivityRepository(Module1DbContext db) : IUserActivityRepository
{
    public async Task AddAsync(UserActivityEvent ev, CancellationToken ct = default)
    {
        if (db.Entry(ev).State == EntityState.Detached)
            await db.UserActivityEvents.AddAsync(ev, ct);
    }

    public async Task<List<Guid>> GetRecentlyViewedProductIdsAsync(Guid customerId, int limit, CancellationToken ct = default)
    {
        // Lấy dư rồi distinct giữ thứ tự mới nhất (tránh DISTINCT+ORDER BY phức tạp trên SQL).
        var ids = await db.UserActivityEvents
            .Where(x => x.CustomerId == customerId && x.ProductId != null
                        && x.EventType == ActivityEventType.View)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.ProductId!.Value)
            .Take(limit * 5)
            .ToListAsync(ct);
        return ids.Distinct().Take(limit).ToList();
    }

    public Task<List<Guid>> GetTrendingProductIdsAsync(int days, int limit, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        return db.UserActivityEvents
            .Where(x => x.ProductId != null && x.CreatedAt >= since
                        && (x.EventType == ActivityEventType.View || x.EventType == ActivityEventType.Purchase))
            .GroupBy(x => x.ProductId!.Value)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<List<Guid>> GetRecentCategoryIdsAsync(Guid customerId, int limit, CancellationToken ct = default)
    {
        var cats = await db.UserActivityEvents
            .Where(x => x.CustomerId == customerId && x.CategoryId != null
                        && x.EventType == ActivityEventType.View)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.CategoryId!.Value)
            .Take(limit * 5)
            .ToListAsync(ct);
        return cats.Distinct().Take(limit).ToList();
    }

    public async Task<List<TrendingScore>> GetTrendingScoredAsync(int days, int limit, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var raw = await db.UserActivityEvents
            .Where(x => x.ProductId != null && x.CreatedAt >= since
                        && (x.EventType == ActivityEventType.View || x.EventType == ActivityEventType.Purchase))
            .GroupBy(x => x.ProductId!.Value)
            .Select(g => new { Pid = g.Key, Count = g.Count() })
            .OrderByDescending(a => a.Count)
            .Take(limit)
            .ToListAsync(ct);
        return raw.Select(a => new TrendingScore(a.Pid, a.Count)).ToList();
    }

    public async Task<List<CoViewSourceRow>> GetCoViewSourceAsync(int days, int maxRows, CancellationToken ct = default)
    {
        var since = DateTime.UtcNow.AddDays(-days);
        var raw = await db.UserActivityEvents
            .Where(x => x.EventType == ActivityEventType.View && x.ProductId != null && x.CreatedAt >= since)
            .Select(x => new { x.CustomerId, x.SessionKey, Pid = x.ProductId!.Value })
            .Distinct()
            .Take(maxRows)
            .ToListAsync(ct);
        return raw.Select(a => new CoViewSourceRow(a.CustomerId, a.SessionKey, a.Pid)).ToList();
    }
}

// ── TrendingProduct cache ─────────────────────────────────────────────────────
public class TrendingProductRepository(Module1DbContext db) : ITrendingProductRepository
{
    public Task<List<Guid>> GetTopProductIdsAsync(int limit, CancellationToken ct = default) =>
        db.TrendingProducts.OrderBy(x => x.Rank).Take(limit).Select(x => x.ProductId).ToListAsync(ct);

    public async Task ReplaceAllAsync(IReadOnlyList<TrendingProduct> rows, CancellationToken ct = default)
    {
        await db.TrendingProducts.ExecuteDeleteAsync(ct);
        if (rows.Count > 0) await db.TrendingProducts.AddRangeAsync(rows, ct);
    }
}

// ── ProductEmbedding (pgvector) ───────────────────────────────────────────────
public class ProductEmbeddingRepository(Module1DbContext db) : IProductEmbeddingRepository
{
    public async Task UpsertAsync(Guid productId, Vector embedding, string model, CancellationToken ct = default)
    {
        var existing = await db.ProductEmbeddings.FirstOrDefaultAsync(x => x.ProductId == productId, ct);
        if (existing is null)
            await db.ProductEmbeddings.AddAsync(ProductEmbedding.Create(productId, embedding, model), ct);
        else
            existing.Update(embedding, model);
    }

    public async Task<List<Vector>> GetVectorsAsync(IEnumerable<Guid> productIds, CancellationToken ct = default)
    {
        var ids = productIds.Distinct().ToList();
        if (ids.Count == 0) return new();
        return await db.ProductEmbeddings.Where(x => ids.Contains(x.ProductId))
            .Select(x => x.Embedding).ToListAsync(ct);
    }

    public async Task<List<Guid>> FindNearestAsync(
        Vector userVector, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default)
    {
        var exclude = excludeIds.Distinct().ToList();
        return await db.ProductEmbeddings
            .Where(x => !exclude.Contains(x.ProductId))
            .OrderBy(x => x.Embedding.CosineDistance(userVector)) // pgvector <=>
            .Take(limit)
            .Select(x => x.ProductId)
            .ToListAsync(ct);
    }

    public async Task<List<(Guid Id, double Distance)>> FindNearestWithScoreAsync(
        Vector userVector, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default)
    {
        var exclude = excludeIds.Distinct().ToList();
        var rows = await db.ProductEmbeddings
            .Where(x => !exclude.Contains(x.ProductId))
            .Select(x => new { x.ProductId, Dist = x.Embedding.CosineDistance(userVector) })
            .OrderBy(a => a.Dist)
            .Take(limit)
            .ToListAsync(ct);
        return rows.Select(a => (a.ProductId, a.Dist)).ToList();
    }

    public Task<List<Guid>> GetProductIdsMissingEmbeddingAsync(int limit, CancellationToken ct = default) =>
        db.ProductMasters
          .Where(p => p.IsActive && !p.IsForbidden
                      && !db.ProductEmbeddings.Any(e => e.ProductId == p.Id))
          .OrderByDescending(p => p.UpdatedAt)
          .Select(p => p.Id)
          .Take(limit)
          .ToListAsync(ct);
}

// ── ProductCoView (item-to-item) ──────────────────────────────────────────────
public class ProductCoViewRepository(Module1DbContext db) : IProductCoViewRepository
{
    public async Task<List<Guid>> GetRelatedAsync(
        IEnumerable<Guid> seedProductIds, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default)
    {
        var seeds = seedProductIds.Distinct().ToList();
        if (seeds.Count == 0) return new();
        var exclude = excludeIds.Distinct().ToList();

        return await db.ProductCoViews
            .Where(x => seeds.Contains(x.ProductId)
                        && !seeds.Contains(x.RelatedProductId)
                        && !exclude.Contains(x.RelatedProductId))
            .GroupBy(x => x.RelatedProductId)
            .OrderByDescending(g => g.Sum(r => r.Score))
            .Select(g => g.Key)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task ReplaceAllAsync(IReadOnlyList<ProductCoView> rows, CancellationToken ct = default)
    {
        await db.ProductCoViews.ExecuteDeleteAsync(ct);
        if (rows.Count > 0) await db.ProductCoViews.AddRangeAsync(rows, ct);
    }
}

public class UserFavoriteRepository(Module1DbContext db) : IUserFavoriteRepository
{
    public Task<bool> ExistsAsync(Guid customerId, Guid productId, CancellationToken ct = default) =>
        db.UserFavorites.AnyAsync(x => x.CustomerId == customerId && x.ProductId == productId, ct);

    public Task<UserFavorite?> GetAsync(Guid customerId, Guid productId, CancellationToken ct = default) =>
        db.UserFavorites.FirstOrDefaultAsync(x => x.CustomerId == customerId && x.ProductId == productId, ct);

    public Task<List<UserFavorite>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.UserFavorites.Where(x => x.CustomerId == customerId)
                        .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task AddAsync(UserFavorite fav, CancellationToken ct = default)
    {
        if (db.Entry(fav).State == EntityState.Detached)
            await db.UserFavorites.AddAsync(fav, ct);
    }

    public Task RemoveAsync(UserFavorite fav, CancellationToken ct = default)
    {
        db.UserFavorites.Remove(fav);
        return Task.CompletedTask;
    }
}

public class ProductReviewRepository(Module1DbContext db) : IProductReviewRepository
{
    public Task<ProductReview?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ProductReviews.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<(List<ProductReview> Items, int TotalCount)> GetByProductAsync(
        Guid productId, ReviewStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.ProductReviews.Where(x => x.ProductId == productId);
        if (status.HasValue) q = q.Where(x => x.Status == status);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.CreatedAt)
                           .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public async Task<(List<ProductReview> Items, int TotalCount)> SearchAsync(
        ReviewStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var q = db.ProductReviews.AsQueryable();
        if (status.HasValue) q = q.Where(x => x.Status == status);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(x => x.CreatedAt)
                           .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return (items, total);
    }

    public Task<bool> ExistsForCustomerAsync(Guid productId, Guid customerId, CancellationToken ct = default) =>
        db.ProductReviews.AnyAsync(x => x.ProductId == productId && x.CustomerId == customerId, ct);

    public Task<ProductReview?> GetByProductAndCustomerAsync(Guid productId, Guid customerId, CancellationToken ct = default) =>
        db.ProductReviews.FirstOrDefaultAsync(x => x.ProductId == productId && x.CustomerId == customerId, ct);

    public async Task AddAsync(ProductReview review, CancellationToken ct = default)
    {
        if (db.Entry(review).State == EntityState.Detached)
            await db.ProductReviews.AddAsync(review, ct);
    }

    public Task UpdateAsync(ProductReview review, CancellationToken ct = default)
    {
        if (db.Entry(review).State == EntityState.Detached)
            db.ProductReviews.Update(review);
        return Task.CompletedTask;
    }
}
