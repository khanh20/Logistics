using LG.Module1.ApplicationServices.DTOs.Category;
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

    Task<ProductDetailResponse>  SetFeaturedAsync(Guid id, bool featured, CancellationToken ct = default);
    Task                         DeactivateAsync(Guid id, CancellationToken ct = default);
    Task                         IncrementViewAsync(Guid id, CancellationToken ct = default);
}
