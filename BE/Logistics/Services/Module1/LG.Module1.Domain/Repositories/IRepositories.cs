using LG.Module1.Domain.Entities;
using System.Threading.Tasks;

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
    Task<List<Platform>> GetAllAsync(CancellationToken ct = default);
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
    Task<PlatformAccount?> GetByIdAsync(Guid id, CancellationToken ct = default);
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
    Task<ProductMaster?> GetByPlatformProductIdAsync(Guid shopId, string platformProductId, CancellationToken ct = default);

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
    Task DeleteAsync(ProductVariant variant, CancellationToken ct = default);
    Task RemoveByProductAsync(Guid productId, CancellationToken ct = default);
}

public interface IProductPriceTierRepository
{
    Task<ProductPriceTier?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<ProductPriceTier>> GetByVariantAsync(Guid variantId, CancellationToken ct = default);
    Task AddAsync(ProductPriceTier tier, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductPriceTier> tiers, CancellationToken ct = default);
    Task UpdateAsync(ProductPriceTier tier, CancellationToken ct = default);
    Task DeleteAsync(ProductPriceTier tier, CancellationToken ct = default);
    Task RemoveByVariantAsync(Guid variantId, CancellationToken ct = default);
}

public interface IProductImageRepository
{
    Task<ProductImage?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<ProductImage>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task AddAsync(ProductImage image, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductImage> images, CancellationToken ct = default);
    Task UpdateAsync(ProductImage image, CancellationToken ct = default);
    Task DeleteAsync(ProductImage image, CancellationToken ct = default);
    Task RemoveByProductAsync(Guid productId, CancellationToken ct = default);
}

public interface IProductAttributeRepository
{
    Task<ProductAttribute?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<ProductAttribute>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task AddAsync(ProductAttribute attribute, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<ProductAttribute> attributes, CancellationToken ct = default);
    Task UpdateAsync(ProductAttribute attribute, CancellationToken ct = default);
    Task DeleteAsync(ProductAttribute attribute, CancellationToken ct = default);
    Task RemoveByProductAsync(Guid productId, CancellationToken ct = default);
}

// ── Cart repos ────────────────────────────────────────────────────────────────
public interface ICartRepository
{
    /// Lấy cart Active của customer (có Items + Variant + Product).
    Task<Cart?> GetActiveByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<Cart?> GetByIdAsync(Guid cartId, CancellationToken ct = default);
    Task AddAsync(Cart cart, CancellationToken ct = default);
    Task UpdateAsync(Cart cart, CancellationToken ct = default);

    /// Lấy danh sách CartItem theo danh sách id — dùng khi checkout một phần.
    Task<List<CartItem>> GetItemsByIdsAsync(Guid cartId, IEnumerable<Guid> itemIds, CancellationToken ct = default);
}

public interface ICartItemRepository
{
    Task AddAsync(CartItem item, CancellationToken ct = default);
    Task DeleteAsync(CartItem item, CancellationToken ct = default);
    Task DeleteRangeAsync(IEnumerable<CartItem> items, CancellationToken ct = default);
}

public interface IOrderStatusHistoryRepository
{
    Task AddAsync(OrderStatusHistory entry, CancellationToken ct = default);
}

// ── CustomerOrder repos ───────────────────────────────────────────────────────
public interface ICustomerOrderRepository
{
    Task<CustomerOrder?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CustomerOrder?> GetByIdWithDetailsAsync(Guid id, CancellationToken ct = default);
    Task<CustomerOrder?> GetByOrderCodeAsync(string orderCode, CancellationToken ct = default);

    Task<(List<CustomerOrder> Items, int TotalCount)> SearchAsync(
        Guid? customerId, Guid? assignedStaffId, OrderStatus? status,
        DateTime? fromDate, DateTime? toDate,
        int page, int pageSize, CancellationToken ct = default);

    /// Lấy các đơn chưa được assign và đang ở trạng thái PendingPayment/Paid.
    Task<List<CustomerOrder>> GetUnassignedPaidOrdersAsync(int take, CancellationToken ct = default);

    /// Lấy các đơn PendingPayment đã quá timeout (phút).
    Task<List<CustomerOrder>> GetTimedOutPendingOrdersAsync(int timeoutMinutes, CancellationToken ct = default);

    Task AddAsync(CustomerOrder order, CancellationToken ct = default);
    Task UpdateAsync(CustomerOrder order, CancellationToken ct = default);
}

// ── PlatformOrder repos ───────────────────────────────────────────────────────
public interface IPlatformOrderRepository
{
    Task<PlatformOrder?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PlatformOrder?> GetByCustomerOrderAsync(Guid customerOrderId, CancellationToken ct = default);
    Task<List<PlatformOrder>> GetByStaffAsync(Guid staffId, OrderStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(PlatformOrder order, CancellationToken ct = default);
    Task UpdateAsync(PlatformOrder order, CancellationToken ct = default);
}

// ── StaffAssignment repos ─────────────────────────────────────────────────────
public interface IStaffAssignmentRepository
{
    /// Lấy assignment đang active (chưa CompletedAt) của đơn.
    Task<StaffAssignment?> GetActiveByOrderIdAsync(Guid orderId, CancellationToken ct = default);

    /// Lấy tất cả assignment (lịch sử) của đơn.
    Task<List<StaffAssignment>> GetAllByOrderIdAsync(Guid orderId, CancellationToken ct = default);

    /// Lấy danh sách assignment đang active của một staff.
    Task<List<StaffAssignment>> GetByStaffIdAsync(Guid staffId, bool activeOnly,
                                                   CancellationToken ct = default);

    /// Lấy tất cả assignment đã overdue (IsOverdue = true, chưa CompletedAt).
    Task<List<StaffAssignment>> GetOverdueAsync(CancellationToken ct = default);

    /// Lấy tất cả assignment chưa hoàn thành và SlaDeadline < UtcNow (cho SlaMonitorJob).
    Task<List<StaffAssignment>> GetPendingExpiredAsync(CancellationToken ct = default);

    /// Đếm số đơn đang active của staff (activeLoad cho WorkloadBalancer).
    Task<int> GetActiveLoadAsync(Guid staffId, CancellationToken ct = default);

    /// Đếm số đơn overdue của staff (cho WorkloadBalancer tie-break).
    Task<int> GetOverdueCountAsync(Guid staffId, CancellationToken ct = default);

    Task AddAsync(StaffAssignment assignment, CancellationToken ct = default);
    Task UpdateAsync(StaffAssignment assignment, CancellationToken ct = default);
}

// ── Unit of Work ──────────────────────────────────────────────────────────────
public interface IModule1UnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}
