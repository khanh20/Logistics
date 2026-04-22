using LG.Module1.Domain.Entities;

namespace LG.Module1.Domain.Repositories;

// ── Lookup repos ──────────────────────────────────────────────────────────────
public interface IProductCategoryRepository
{
    Task<ProductCategory?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductCategory?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<List<ProductCategory>> GetAllAsync(bool activeOnly = true, CancellationToken ct = default);
    Task<List<ProductCategory>> GetChildrenAsync(Guid? parentId, CancellationToken ct = default);
    Task AddAsync(ProductCategory category, CancellationToken ct = default);
    Task UpdateAsync(ProductCategory category, CancellationToken ct = default);
    Task DeleteAsync(ProductCategory category, CancellationToken ct = default);
}

public interface IForbiddenCategoryRepository
{
    Task<List<ForbiddenCategory>> GetAllActiveAsync(CancellationToken ct = default);
    Task<ForbiddenCategory?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(ForbiddenCategory category, CancellationToken ct = default);
    Task UpdateAsync(ForbiddenCategory category, CancellationToken ct = default);
}

public interface ICancelReasonRepository
{
    Task<List<CancelReason>> GetAllActiveAsync(CancellationToken ct = default);
    Task<CancelReason?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(CancelReason reason, CancellationToken ct = default);
}

public interface IDepositConfigRepository
{
    Task<DepositConfig?> GetActiveForCustomerAsync(Guid? vipTierId, CancellationToken ct = default);
    Task<List<DepositConfig>> GetAllAsync(CancellationToken ct = default);
    Task<DepositConfig?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(DepositConfig config, CancellationToken ct = default);
    Task UpdateAsync(DepositConfig config, CancellationToken ct = default);
}

public interface IExchangeRateHistoryRepository
{
    Task<ExchangeRateHistory?> GetCurrentAsync(CancellationToken ct = default);
    Task<List<ExchangeRateHistory>> GetHistoryAsync(int limit = 30, CancellationToken ct = default);
    Task AddAsync(ExchangeRateHistory rate, CancellationToken ct = default);
    Task UpdateAsync(ExchangeRateHistory rate, CancellationToken ct = default);
}

// ── Platform repos ────────────────────────────────────────────────────────────
public interface IPlatformRepository
{
    Task<Platform?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<Platform>> GetAllActiveAsync(CancellationToken ct = default);
    Task<List<Platform>> GetByApiProviderAsync(ApiProvider provider, CancellationToken ct = default);
    Task AddAsync(Platform platform, CancellationToken ct = default);
    Task UpdateAsync(Platform platform, CancellationToken ct = default);
}

public interface IPlatformShopRepository
{
    Task<PlatformShop?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PlatformShop?> GetByExternalIdAsync(Guid platformId, string shopIdOnPlatform, CancellationToken ct = default);
    Task<List<PlatformShop>> GetByPlatformAsync(Guid platformId, CancellationToken ct = default);
    Task AddAsync(PlatformShop shop, CancellationToken ct = default);
    Task UpdateAsync(PlatformShop shop, CancellationToken ct = default);
}

public interface IPlatformAccountRepository
{
    Task<PlatformAccount?> GetAvailableAccountAsync(Guid platformId, decimal requiredAmount, CancellationToken ct = default);
    Task<List<PlatformAccount>> GetByPlatformAsync(Guid platformId, CancellationToken ct = default);
    Task AddAsync(PlatformAccount account, CancellationToken ct = default);
    Task UpdateAsync(PlatformAccount account, CancellationToken ct = default);
}

// ── Product repos ─────────────────────────────────────────────────────────────
public interface IProductRepository
{
    Task<ProductMaster?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductMaster?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default);
    Task<ProductMaster?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<ProductMaster?> GetByPlatformProductIdAsync(Guid platformId, string platformProductId, CancellationToken ct = default);

    Task<(List<ProductMaster> Items, int TotalCount)> SearchAsync(
        string? keyword, Guid? categoryId, Guid? platformId,
        decimal? minPriceCny, decimal? maxPriceCny,
        bool activeOnly, int page, int pageSize, CancellationToken ct = default);

    Task<List<ProductMaster>> GetFeaturedAsync(int limit, CancellationToken ct = default);
    Task AddAsync(ProductMaster product, CancellationToken ct = default);
    Task UpdateAsync(ProductMaster product, CancellationToken ct = default);
}

public interface IProductVariantRepository
{
    Task<ProductVariant?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductVariant?> GetByIdWithTiersAsync(Guid id, CancellationToken ct = default);
    Task<List<ProductVariant>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task AddAsync(ProductVariant variant, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductVariant> variants, CancellationToken ct = default);
    Task UpdateAsync(ProductVariant variant, CancellationToken ct = default);
    Task RemoveByProductAsync(Guid productId, CancellationToken ct = default);
}

public interface IProductPriceTierRepository
{
    Task<List<ProductPriceTier>> GetByVariantAsync(Guid variantId, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductPriceTier> tiers, CancellationToken ct = default);
    Task RemoveByVariantAsync(Guid variantId, CancellationToken ct = default);
}

public interface IProductImageRepository
{
    Task<List<ProductImage>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductImage> images, CancellationToken ct = default);
    Task UpdateAsync(ProductImage image, CancellationToken ct = default);
    Task RemoveByProductAsync(Guid productId, CancellationToken ct = default);
}

// ── Unit of Work ──────────────────────────────────────────────────────────────
public interface IModule1UnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}
