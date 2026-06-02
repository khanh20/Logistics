using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Category;
using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.DTOs.Platform;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.Interfaces;

public interface IProductCategoryService
{
    Task<List<CategoryTreeResponse>> GetTreeAsync(CancellationToken ct = default);
    Task<CategoryTreeResponse>       GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CategoryTreeResponse>       CreateAsync(CreateCategoryRequest req, CancellationToken ct = default);
    Task<CategoryTreeResponse>       UpdateAsync(Guid id, UpdateCategoryRequest req, CancellationToken ct = default);
    Task                             DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface IForbiddenCategoryService
{
    Task<List<ForbiddenCategoryResponse>> GetAllAsync(CancellationToken ct = default);
    Task<ForbiddenCategoryResponse>       CreateAsync(CreateForbiddenCategoryRequest req, Guid adminId, CancellationToken ct = default);
    Task<ForbiddenCategoryResponse>       UpdateAsync(Guid id, CreateForbiddenCategoryRequest req, CancellationToken ct = default);
    /// Kiểm tra một tiêu đề có vi phạm bất kỳ danh mục cấm nào không.
    Task<(bool IsForbidden, Guid? CategoryId, string? CategoryName)>
        CheckTitleAsync(string title, CancellationToken ct = default);
}

public interface IExchangeRateService
{
    Task<ExchangeRateResponse>       GetCurrentAsync(CancellationToken ct = default);
    Task<List<ExchangeRateResponse>> GetHistoryAsync(int limit = 30, CancellationToken ct = default);
    Task<ExchangeRateResponse>       UpdateAsync(UpdateExchangeRateRequest req, Guid adminId, CancellationToken ct = default);
}

public interface IDepositConfigService
{
    Task<List<DepositConfigResponse>> GetAllAsync(CancellationToken ct = default);
    Task<DepositConfigResponse>       GetActiveForCustomerAsync(Guid? vipTierId, CancellationToken ct = default);
}

public interface IProductService
{
    Task<PagedProductResponse>   SearchAsync(ProductSearchRequest req, CancellationToken ct = default);
    Task<ProductDetailResponse>  GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductDetailResponse>  GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<List<ProductListItemResponse>> GetFeaturedAsync(int limit = 10, CancellationToken ct = default);

    /// Tạo hoặc cập nhật product từ kết quả crawl/API.
    /// Tự động kiểm tra hàng cấm sau khi upsert.
    Task<ProductDetailResponse>  UpsertFromRawAsync(UpsertProductRequest req, CancellationToken ct = default);

    /// Lấy chi tiết sản phẩm cho Admin — KHÔNG tăng ViewCount.
    Task<ProductDetailResponse>  GetDetailForAdminAsync(Guid id, CancellationToken ct = default);

    /// Cập nhật thông tin cơ bản (translation, seo, category) theo Id — Admin only.
    Task<ProductDetailResponse>  UpdateInfoAsync(Guid id, UpdateProductInfoRequest req, CancellationToken ct = default);

    Task<ProductDetailResponse>  SetFeaturedAsync(Guid id, bool featured, CancellationToken ct = default);
    Task                         DeactivateAsync(Guid id, CancellationToken ct = default);
    Task                         IncrementViewAsync(Guid id, CancellationToken ct = default);
}

public interface IProductVariantService
{
    Task<List<ProductVariantResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task<ProductVariantResponse> GetByIdAsync(Guid variantId, CancellationToken ct = default);

    /// Thêm một variant mới vào product đã có.
    Task<ProductVariantResponse> AddAsync(Guid productId, AddVariantRequest req, CancellationToken ct = default);

    /// Cập nhật thông tin variant (tên, giá, tồn kho, sort).
    Task<ProductVariantResponse> UpdateAsync(Guid variantId, UpdateVariantRequest req, CancellationToken ct = default);

    /// Xóa variant. Không xóa nếu đang có đơn hàng active dùng variant này.
    Task DeleteAsync(Guid variantId, CancellationToken ct = default);

    /// Thay thế toàn bộ price tiers của một variant.
    /// Client gửi danh sách tier mới — server delete cũ, insert mới trong 1 transaction.
    Task<ProductVariantResponse> SyncPriceTiersAsync(Guid variantId, SyncPriceTiersRequest req, CancellationToken ct = default);
}

// ── Image service ─────────────────────────────────────────────────────────────
public interface IProductImageService
{
    Task<List<ProductImageResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default);

    /// Thêm ảnh mới. Check trùng SourceUrlHash trước khi thêm.
    Task<ProductImageResponse> AddAsync(Guid productId, AddImageRequest req, CancellationToken ct = default);

    /// Cập nhật local CDN URL sau khi rehost ảnh.
    Task<ProductImageResponse> SetCdnUrlAsync(Guid imageId, SetImageCdnRequest req, CancellationToken ct = default);

    /// Đặt ảnh này làm ảnh chính — tự động bỏ primary của ảnh cũ.
    Task<ProductImageResponse> SetPrimaryAsync(Guid imageId, CancellationToken ct = default);

    /// Cập nhật thứ tự hiển thị của nhiều ảnh trong 1 lần gọi.
    Task ReorderAsync(Guid productId, ReorderImagesRequest req, CancellationToken ct = default);

    Task DeleteAsync(Guid imageId, CancellationToken ct = default);
}

// ── Attribute service ─────────────────────────────────────────────────────────
public interface IProductAttributeService
{
    Task<List<ProductAttributeResponse>> GetByProductAsync(Guid productId, CancellationToken ct = default);
    Task<ProductAttributeResponse> AddAsync(Guid productId, AddAttributeRequest req, CancellationToken ct = default);
    Task<ProductAttributeResponse> UpdateAsync(Guid attributeId, AddAttributeRequest req, CancellationToken ct = default);
    Task DeleteAsync(Guid attributeId, CancellationToken ct = default);

    /// Thay thế toàn bộ attributes của product (dùng sau crawl).
    Task<List<ProductAttributeResponse>> SyncAsync(Guid productId, List<AddAttributeRequest> attributes, CancellationToken ct = default);
}

// ── Extension Cart (Chrome Extension scraping) ─────────────────────
public interface IExtensionCartService
{
    Task<AddFromExtensionResponse> AddAsync(Guid customerId,
        AddFromExtensionRequest req, CancellationToken ct = default);
}

// ── Cart ────────────────────────────────────────────────────────────
public interface ICartService
{
    /// Lấy cart Active của customer. Tạo mới nếu chưa có.
    Task<CartResponse>          GetOrCreateCartAsync(Guid customerId, CancellationToken ct = default);

    /// Thêm item vào cart (merge nếu trùng variant).
    Task<CartResponse>          AddItemAsync(Guid customerId, AddCartItemRequest req, CancellationToken ct = default);

    /// Cập nhật số lượng 1 item.
    Task<CartResponse>          UpdateItemQuantityAsync(Guid customerId, Guid cartItemId, UpdateCartItemQuantityRequest req, CancellationToken ct = default);

    /// Xóa 1 item khỏi cart.
    Task<CartResponse>          RemoveItemAsync(Guid customerId, Guid cartItemId, CancellationToken ct = default);

    /// Xóa toàn bộ items.
    Task<CartResponse>          ClearCartAsync(Guid customerId, CancellationToken ct = default);

    /// Preview chi phí checkout (tính deposit, tỉ giá) — không tạo đơn.
    Task<CheckoutPreviewResponse>  PreviewCheckoutAsync(Guid customerId, CheckoutPreviewRequest req, CancellationToken ct = default);

    /// Tạo đơn hàng từ cart (atomic, dùng transaction).
    /// 1 shop → 1 CustomerOrder. Trả về danh sách order đã tạo.
    Task<ConfirmCheckoutResponse>  ConfirmCheckoutAsync(Guid customerId, ConfirmCheckoutRequest req, CancellationToken ct = default);
}

// ── Order (Customer) ────────────────────────────────────────────────
public interface ICustomerOrderService
{
    Task<(List<OrderListItemResponse> Items, int TotalCount)>
        GetMyOrdersAsync(Guid customerId, OrderStatus? status, int page, int pageSize, CancellationToken ct = default);

    Task<OrderDetailResponse> GetMyOrderDetailAsync(Guid customerId, Guid orderId, CancellationToken ct = default);

    /// Khách hủy đơn (chỉ được hủy khi còn ở PendingPayment / AwaitingManualPlace).
    Task<OrderDetailResponse> CancelOrderAsync(Guid customerId, Guid orderId, CancelOrderRequest req, CancellationToken ct = default);

    /// Placeholder Phase 8 — khách xác nhận đặt cọc (wallet trả tiền).
    Task<OrderDetailResponse> PayDepositAsync(Guid customerId, Guid orderId, CancellationToken ct = default);
}

// ── Order (Staff) ───────────────────────────────────────────────────
public interface IOrderManagementService
{
    Task<(List<StaffOrderListItemResponse> Items, int TotalCount)>
        GetOrdersAsync(OrderListFilter filter, CancellationToken ct = default);

    Task<OrderDetailResponse> GetOrderDetailAsync(Guid orderId, CancellationToken ct = default);

    /// Staff nhận đơn — chuyển sang AwaitingManualPlace / AwaitingApiPlace.
    Task<OrderDetailResponse> AssignOrderAsync(Guid orderId, Guid staffId, CancellationToken ct = default);

    /// Ghi nhận đã đặt hàng thủ công trên sàn.
    Task<OrderDetailResponse> RecordManualPlacementAsync(Guid orderId, Guid staffId, ManualPlacementRequest req, CancellationToken ct = default);

    /// Cập nhật mã tracking từ shop gửi.
    Task<OrderDetailResponse> UpdateTrackingAsync(Guid orderId, Guid staffId, UpdateTrackingRequest req, CancellationToken ct = default);

    /// Ghi nhận hàng đã về kho TQ.
    Task<OrderDetailResponse> MarkArrivedChinaAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);

    /// Ghi nhận đang vận chuyển quốc tế.
    Task<OrderDetailResponse> MarkShippingToVNAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);

    /// Ghi nhận hàng đã về kho VN.
    Task<OrderDetailResponse> MarkArrivedVietnamAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);

    /// Ghi nhận đang giao cho khách.
    Task<OrderDetailResponse> MarkDeliveringAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);

    /// Hoàn thành đơn.
    Task<OrderDetailResponse> MarkCompletedAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);

    /// Ghi nhận vấn đề phát sinh.
    Task<OrderDetailResponse> RecordIssueAsync(Guid orderId, Guid staffId, RecordIssueRequest req, CancellationToken ct = default);

    /// Staff hủy đơn.
    Task<OrderDetailResponse> CancelByStaffAsync(Guid orderId, Guid staffId, CancelOrderRequest req, CancellationToken ct = default);

    /// Ghi nhận hoàn hàng.
    Task<OrderDetailResponse> MarkReturnedAsync(Guid orderId, Guid staffId, OrderTransitionRequest req, CancellationToken ct = default);
}

// ── Wallet stub (Phase 8) ──────────────────────────────────────────
public interface IWalletService
{
    /// Kiểm tra số dư ví — stub Phase 8, luôn trả available = 0.
    Task<decimal> GetBalanceAsync(Guid customerId, CancellationToken ct = default);

    /// Trừ tiền ví — stub Phase 8, throw NotImplementedException.
    Task DeductAsync(Guid customerId, decimal amountVnd, string description, CancellationToken ct = default);
}

// ── Staff Assignment ─────────────────────────────────────────────────────────
public interface IStaffAssignmentService
{
    /// Auto-assign đơn dựa trên workload. Trả null nếu không có staff.
    Task<StaffAssignmentDto?> AutoAssignAsync(Guid orderId,
        IReadOnlyList<Guid> availableStaffIds, CancellationToken ct = default);

    /// Admin tự chọn staff cho đơn cụ thể.
    Task<StaffAssignmentDto> ManualAssignAsync(Guid orderId, Guid staffId, Guid adminId,
        string? note, CancellationToken ct = default);

    /// Chuyển đơn sang nhân viên khác (soft-complete assignment cũ).
    Task<StaffAssignmentDto> ReassignAsync(Guid orderId, Guid newStaffId, Guid adminId,
        string? note, CancellationToken ct = default);

    /// Đánh dấu assignment đã hoàn thành (staff xử lý xong).
    Task MarkCompletedAsync(Guid assignmentId, CancellationToken ct = default);

    /// Danh sách assignment đang quá SLA.
    Task<List<OverdueAssignmentDto>> GetOverdueAsync(CancellationToken ct = default);

    /// Workload hiện tại của một staff.
    Task<StaffWorkloadDto> GetWorkloadAsync(Guid staffId, CancellationToken ct = default);

    /// Lấy assignment đang active của một đơn (nếu có).
    Task<StaffAssignmentDto?> GetActiveByOrderAsync(Guid orderId, CancellationToken ct = default);
}

public interface IPlatformService
{
    // ── Platform ──────────────────────────────────────────────────────────────
    Task<List<PlatformResponse>> GetAllAsync(CancellationToken ct = default);
    Task<List<PlatformSlimResponse>> GetAllActiveAsync(CancellationToken ct = default);
    Task<PlatformResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PlatformResponse> CreateAsync(CreatePlatformRequest req, CancellationToken ct = default);
    Task<PlatformResponse> UpdateAsync(Guid id, UpdatePlatformRequest req, CancellationToken ct = default);

    /// Cập nhật ApiKey/ApiSecret cho platform.
    /// Credentials được encrypt bằng IDataProtector trước khi lưu.
    /// Chỉ Admin mới gọi được — không bao giờ trả key ra ngoài qua API.
    Task SetCredentialsAsync(Guid id, SetCredentialsRequest req, CancellationToken ct = default);

    // ── PlatformShop ──────────────────────────────────────────────────────────
    Task<List<PlatformShopResponse>> GetShopsByPlatformAsync(Guid platformId, CancellationToken ct = default);
    Task<PlatformShopResponse> GetShopByIdAsync(Guid shopId, CancellationToken ct = default);

    /// Blacklist một shop — NV_MuaHang hoặc Admin.
    Task BlacklistShopAsync(Guid shopId, BlacklistShopRequest req, Guid staffId, CancellationToken ct = default);

    /// Gỡ blacklist một shop.
    Task UnblacklistShopAsync(Guid shopId, CancellationToken ct = default);

    /// Cập nhật rating và stats cho shop sau khi có thêm dữ liệu.
    Task UpdateShopRatingAsync(Guid shopId, decimal rating, CancellationToken ct = default);

    // ── PlatformAccount ───────────────────────────────────────────────────────
    Task<List<PlatformAccountSummaryResponse>> GetAccountsByPlatformAsync(Guid platformId, CancellationToken ct = default);

    /// Lấy account còn capacity để đặt hàng.
    /// Chọn account ít dùng nhất (DailySpentToday thấp nhất).
    Task<PlatformAccountSummaryResponse?> GetAvailableAccountAsync(Guid platformId, decimal requiredAmountCny, CancellationToken ct = default);

    Task<PlatformAccountSummaryResponse> CreateAccountAsync(CreatePlatformAccountRequest req, CancellationToken ct = default);
    Task FreezeAccountAsync(Guid accountId, CancellationToken ct = default);
    Task UnfreezeAccountAsync(Guid accountId, CancellationToken ct = default);
    Task UpdateBalanceAsync(Guid accountId, UpdateAccountBalanceRequest req, CancellationToken ct = default);
}
