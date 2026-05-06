using LG.Module1.ApplicationServices.DTOs.Category;
using LG.Module1.ApplicationServices.DTOs.Platform;
using LG.Module1.ApplicationServices.DTOs.Product;

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
