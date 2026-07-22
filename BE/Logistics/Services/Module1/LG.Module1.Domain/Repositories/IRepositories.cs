using LG.Module1.Domain.Entities;
using Pgvector;
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

    /// Tìm sản phẩm đã có theo platform + id-trên-sàn (không cần shopId) — dùng khi resolve link mà DB đã fetch sẵn.
    Task<ProductMaster?> GetByPlatformAndProductIdAsync(Guid platformId, string platformProductId, CancellationToken ct = default);

    Task<(List<ProductMaster> Items, int TotalCount)> SearchAsync(
        string? keyword, Guid? categoryId, Guid? platformId,
        decimal? minPriceCny, decimal? maxPriceCny,
        bool activeOnly, ProductSort sort, int page, int pageSize, CancellationToken ct = default);

    // Truy hồi hybrid: lexical (ILIKE) + vector ANN, hợp nhất RRF, cùng bộ filter.
    // Items = tối đa poolSize ứng viên theo điểm RRF; LexicalTotal = tổng khớp lexical thật (cho phân trang).
    Task<(List<ProductMaster> Items, int LexicalTotal)> SearchHybridAsync(
        string? keyword, Guid? categoryId, Guid? platformId,
        decimal? minPriceCny, decimal? maxPriceCny, bool activeOnly,
        Pgvector.Vector? queryVector, int poolSize, CancellationToken ct = default);

    Task<List<ProductMaster>> GetFeaturedAsync(int limit, CancellationToken ct = default);

    /// Nạp nhiều sản phẩm theo danh sách Id (cho recommendation). Chỉ trả active + không cấm.
    Task<List<ProductMaster>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default);

    /// Top sản phẩm trong các danh mục (loại trừ excludeIds), sắp theo lượt xem — cho recommend theo nội dung.
    Task<List<ProductMaster>> GetTopByCategoriesAsync(
        IEnumerable<Guid> categoryIds, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default);

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

    /// Đếm số đơn đã hoàn tất của 1 khách — dùng phân khúc khách cho recommendation.
    Task<int> CountCompletedByCustomerAsync(Guid customerId, CancellationToken ct = default);

    /// Id sản phẩm khách đã MUA (từ đơn Completed) — tín hiệu mạnh nhất cho gợi ý.
    Task<List<Guid>> GetPurchasedProductIdsAsync(Guid customerId, int limit, CancellationToken ct = default);
    /// Id shop khách đã mua hàng (đơn Completed) — cho "hàng từ shop quen".
    Task<List<Guid>> GetPurchasedShopIdsAsync(Guid customerId, CancellationToken ct = default);
    /// Khách đã từng mua sản phẩm này chưa (đơn Completed) — điều kiện để đánh giá.
    Task<bool> HasPurchasedProductAsync(Guid customerId, Guid productId, CancellationToken ct = default);

    Task AddAsync(CustomerOrder order, CancellationToken ct = default);
    Task UpdateAsync(CustomerOrder order, CancellationToken ct = default);

    /// Lấy tổng doanh thu phí của hệ thống trong 1 ngày (dựa theo ngày thanh toán - PaidAt).
    Task<(int TotalOrders, decimal ServiceFee, decimal ShippingFee, decimal InspectionFee, decimal InsuranceFee, decimal EntrustmentFee, decimal VatFee, decimal DutyFee)> GetDailyRevenueSummaryAsync(DateOnly date, CancellationToken ct = default);
}

// ── PlatformOrder repos ───────────────────────────────────────────────────────
public interface IPlatformOrderRepository
{
    Task<PlatformOrder?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PlatformOrder?> GetByCustomerOrderAsync(Guid customerOrderId, CancellationToken ct = default);
    Task<List<PlatformOrder>> GetByStaffAsync(Guid staffId, OrderStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(PlatformOrder order, CancellationToken ct = default);
    Task UpdateAsync(PlatformOrder order, CancellationToken ct = default);
    Task<decimal> GetDailyPlatformCostAsync(Guid accountId, DateOnly date, CancellationToken ct = default);
}

// ── StaffAssignment repos ─────────────────────────────────────────────────────
public interface IStaffAssignmentRepository
{
    /// Lấy 1 assignment theo Id (kèm Order để map OrderCode).
    Task<StaffAssignment?> GetByIdAsync(Guid id, CancellationToken ct = default);

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

    /// Hàng đợi của 1 NV — kèm Order, lọc trạng thái đóng/mở. Cho portal NV.
    Task<List<StaffAssignment>> GetQueueByStaffAsync(Guid staffId, bool includeClosed,
                                                     CancellationToken ct = default);

    /// Lấy assignment được gán trong khoảng (theo AssignedAt) — cho KPI aggregation.
    Task<List<StaffAssignment>> GetAssignedBetweenAsync(DateTime fromUtc, DateTime toUtc,
                                                        CancellationToken ct = default);

    Task AddAsync(StaffAssignment assignment, CancellationToken ct = default);
    Task UpdateAsync(StaffAssignment assignment, CancellationToken ct = default);
}

// ── Extension Scrape Log ──────────────────────────────────────────────────────
public interface IExtensionScrapeLogRepository
{
    Task AddAsync(ExtensionScrapeLog log, CancellationToken ct = default);
}

// ── Staff ops repos ───────────────────────────────────────────────────────────
public interface IStaffWorkSettingRepository
{
    Task<StaffWorkSetting?> GetByStaffIdAsync(Guid staffId, CancellationToken ct = default);
    Task<List<StaffWorkSetting>> GetAllAsync(CancellationToken ct = default);
    /// Cấu hình của những NV trong danh sách Id (cho auto-assign filter).
    Task<List<StaffWorkSetting>> GetByStaffIdsAsync(IEnumerable<Guid> staffIds, CancellationToken ct = default);
    Task AddAsync(StaffWorkSetting setting, CancellationToken ct = default);
    Task UpdateAsync(StaffWorkSetting setting, CancellationToken ct = default);
}

public interface IStaffPerformanceRepository
{
    Task<StaffPerformanceDaily?> GetAsync(Guid staffId, DateOnly date, CancellationToken ct = default);
    Task<List<StaffPerformanceDaily>> GetRangeAsync(Guid? staffId, DateOnly from, DateOnly to,
                                                    CancellationToken ct = default);
    Task AddAsync(StaffPerformanceDaily snapshot, CancellationToken ct = default);
    Task UpdateAsync(StaffPerformanceDaily snapshot, CancellationToken ct = default);
}

public interface IStaffNotificationRepository
{
    Task<List<StaffNotification>> GetByStaffAsync(Guid staffId, bool unreadOnly, int take,
                                                  CancellationToken ct = default);
    Task<int> CountUnreadAsync(Guid staffId, CancellationToken ct = default);
    Task<StaffNotification?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid staffId, CancellationToken ct = default);
    Task AddAsync(StaffNotification notification, CancellationToken ct = default);
    Task UpdateAsync(StaffNotification notification, CancellationToken ct = default);
}

public interface IOrderComplaintRepository
{
    Task<OrderComplaint?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<OrderComplaint>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<(List<OrderComplaint> Items, int TotalCount)> SearchAsync(
        ComplaintStatus? status, Guid? assignedToStaffId, Guid? customerId,
        int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(OrderComplaint complaint, CancellationToken ct = default);
    Task UpdateAsync(OrderComplaint complaint, CancellationToken ct = default);
}

public interface ISupplierChatLogRepository
{
    Task<List<SupplierChatLog>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task AddAsync(SupplierChatLog log, CancellationToken ct = default);
}

// ── Engagement / Recommendation (Plan C) ─────────────────────────────────────
public interface IUserActivityRepository
{
    Task AddAsync(UserActivityEvent ev, CancellationToken ct = default);
    /// Id sản phẩm user xem gần đây (distinct, mới nhất trước).
    Task<List<Guid>> GetRecentlyViewedProductIdsAsync(Guid customerId, int limit, CancellationToken ct = default);
    /// Sự kiện gần đây (mới nhất trước) kèm thời điểm/loại/phiên, mọi EventType.
    Task<List<BehaviorEventRow>> GetRecentEventsAsync(Guid customerId, int limit, CancellationToken ct = default);
    /// Id sản phẩm được tương tác nhiều nhất trong N ngày gần đây (trending).
    Task<List<Guid>> GetTrendingProductIdsAsync(int days, int limit, CancellationToken ct = default);
    /// Danh mục user xem gần đây (distinct) — cho recommend theo nội dung.
    Task<List<Guid>> GetRecentCategoryIdsAsync(Guid customerId, int limit, CancellationToken ct = default);
    /// Trending kèm điểm (count) — TrendingAggregationJob dùng để ghi cache.
    Task<List<TrendingScore>> GetTrendingScoredAsync(int days, int limit, CancellationToken ct = default);
    /// Nguồn tính co-view: các cặp (phiên, sản phẩm) đã View trong N ngày (distinct).
    Task<List<CoViewSourceRow>> GetCoViewSourceAsync(int days, int maxRows, CancellationToken ct = default);
}

// 1 dòng nguồn co-view: phiên (CustomerId hoặc SessionKey) + sản phẩm đã xem.
public readonly record struct CoViewSourceRow(Guid? CustomerId, string? SessionKey, Guid ProductId);

public interface IProductCoViewRepository
{
    /// Sản phẩm hay được xem chung với các seed (gộp điểm), loại trừ; điểm cao trước.
    Task<List<Guid>> GetRelatedAsync(IEnumerable<Guid> seedProductIds, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default);
    Task ReplaceAllAsync(IReadOnlyList<ProductCoView> rows, CancellationToken ct = default);
}

public interface ITrendingProductRepository
{
    /// Top productId theo rank đã precompute (đọc cache cho recommendation).
    Task<List<Guid>> GetTopProductIdsAsync(int limit, CancellationToken ct = default);
    /// Thay toàn bộ snapshot trending (job gọi).
    Task ReplaceAllAsync(IReadOnlyList<TrendingProduct> rows, CancellationToken ct = default);
}

// ── Vector embedding (Plan G — pgvector) ─────────────────────────────────────
public interface IProductEmbeddingRepository
{
    Task UpsertAsync(Guid productId, Vector embedding, string model, CancellationToken ct = default);
    /// Lấy vector của các sản phẩm (để dựng user-vector).
    Task<List<Vector>> GetVectorsAsync(IEnumerable<Guid> productIds, CancellationToken ct = default);
    /// ANN cosine: id sản phẩm gần userVector nhất, loại trừ excludeIds.
    Task<List<Guid>> FindNearestAsync(Vector userVector, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default);
    /// Như FindNearest nhưng kèm cosine distance (để dùng làm điểm similarity trong rank).
    Task<List<(Guid Id, double Distance)>> FindNearestWithScoreAsync(Vector userVector, IEnumerable<Guid> excludeIds, int limit, CancellationToken ct = default);
    /// ANN quanh TỪNG seed rồi gộp, điểm = trọng_số_seed × cosine, giữ seed thắng.
    /// Không trung bình các seed thành một vector: trung bình của những seed không liên
    /// quan nhau rơi vào vùng dày nhất của catalog nên trả về toàn hàng phổ biến chung
    /// chung. Giữ riêng từng seed còn cho phép truy vết gợi ý về đúng hành vi sinh ra nó.
    Task<List<SeedMatch>> FindNearestPerSeedAsync(IReadOnlyList<WeightedSeed> seeds, IEnumerable<Guid> excludeIds, int perSeed, int limit, CancellationToken ct = default);
    /// Sản phẩm active chưa có embedding (cho backfill job).
    Task<List<Guid>> GetProductIdsMissingEmbeddingAsync(int limit, CancellationToken ct = default);
}

public interface IUserFavoriteRepository
{
    Task<bool> ExistsAsync(Guid customerId, Guid productId, CancellationToken ct = default);
    Task<UserFavorite?> GetAsync(Guid customerId, Guid productId, CancellationToken ct = default);
    Task<List<UserFavorite>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task AddAsync(UserFavorite fav, CancellationToken ct = default);
    Task RemoveAsync(UserFavorite fav, CancellationToken ct = default);
}

public interface IProductReviewRepository
{
    Task<ProductReview?> GetByIdAsync(Guid id, CancellationToken ct = default);
    /// Đánh giá của 1 sản phẩm, lọc theo trạng thái (Approved cho khách xem).
    Task<(List<ProductReview> Items, int TotalCount)> GetByProductAsync(
        Guid productId, ReviewStatus? status, int page, int pageSize, CancellationToken ct = default);
    /// Hàng đợi kiểm duyệt (Admin/Staff).
    Task<(List<ProductReview> Items, int TotalCount)> SearchAsync(
        ReviewStatus? status, int page, int pageSize, CancellationToken ct = default);
    Task<bool> ExistsForCustomerAsync(Guid productId, Guid customerId, CancellationToken ct = default);
    Task<ProductReview?> GetByProductAndCustomerAsync(Guid productId, Guid customerId, CancellationToken ct = default);
    Task AddAsync(ProductReview review, CancellationToken ct = default);
    Task UpdateAsync(ProductReview review, CancellationToken ct = default);
}

// ── Unit of Work ──────────────────────────────────────────────────────────────
public interface IModule1UnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}
