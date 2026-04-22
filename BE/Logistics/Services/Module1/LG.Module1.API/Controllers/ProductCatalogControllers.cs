using LG.Module1.ApplicationServices.DTOs.Category;
using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class Module1BaseController : ControllerBase
{
    protected string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? Request.Headers["X-Forwarded-For"].FirstOrDefault();

    protected Guid CurrentUserId =>
        Guid.Parse(HttpContext.User.FindFirst("userId")?.Value
            ?? throw new UnauthorizedAccessException("UserId claim not found."));
}


[Route("api/products")]
public class ProductsController(IProductService productService) : Module1BaseController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<PagedProductResponse>), 200)]
    public async Task<IActionResult> Search([FromQuery] ProductSearchRequest req, CancellationToken ct)
    {
        var result = await productService.SearchAsync(req, ct);
        return Ok(ApiResponse<PagedProductResponse>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ProductDetailResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        await productService.IncrementViewAsync(id, ct);
        var result = await productService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<ProductDetailResponse>.Ok(result));
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ProductDetailResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var result = await productService.GetBySlugAsync(slug, ct);
        return Ok(ApiResponse<ProductDetailResponse>.Ok(result));
    }

    [HttpGet("featured")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ProductListItemResponse>>), 200)]
    public async Task<IActionResult> GetFeatured([FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var result = await productService.GetFeaturedAsync(limit, ct);
        return Ok(ApiResponse<List<ProductListItemResponse>>.Ok(result));
    }


    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductDetailResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Upsert([FromBody] UpsertProductRequest req, CancellationToken ct)
    {
        var result = await productService.UpsertFromRawAsync(req, ct);
        return Ok(ApiResponse<ProductDetailResponse>.Ok(result, "Sản phẩm đã được lưu."));
    }

    [HttpPatch("{id:guid}/featured")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ProductDetailResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> SetFeatured(
        Guid id, [FromQuery] bool featured = true, CancellationToken ct = default)
    {
        var result = await productService.SetFeaturedAsync(id, featured, ct);
        return Ok(ApiResponse<ProductDetailResponse>.Ok(result));
    }


    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await productService.DeactivateAsync(id, ct);
        return Ok(ApiResponse.Ok("Sản phẩm đã được ẩn."));
    }
}

[Route("api/categories")]
public class CategoriesController(IProductCategoryService categorySvc) : Module1BaseController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<CategoryTreeResponse>>), 200)]
    public async Task<IActionResult> GetTree(CancellationToken ct)
    {
        var result = await categorySvc.GetTreeAsync(ct);
        return Ok(ApiResponse<List<CategoryTreeResponse>>.Ok(result));
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<CategoryTreeResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await categorySvc.GetByIdAsync(id, ct);
        return Ok(ApiResponse<CategoryTreeResponse>.Ok(result));
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<CategoryTreeResponse>), 201)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest req, CancellationToken ct)
    {
        var result = await categorySvc.CreateAsync(req, ct);
        return StatusCode(201, ApiResponse<CategoryTreeResponse>.Ok(result, "Danh mục đã được tạo."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<CategoryTreeResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCategoryRequest req, CancellationToken ct)
    {
        var result = await categorySvc.UpdateAsync(id, req, ct);
        return Ok(ApiResponse<CategoryTreeResponse>.Ok(result));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await categorySvc.DeleteAsync(id, ct);
        return Ok(ApiResponse.Ok("Danh mục đã xóa."));
    }
}

[Route("api/forbidden-categories")]
public class ForbiddenCategoriesController(IForbiddenCategoryService forbiddenSvc) : Module1BaseController
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ForbiddenCategoryResponse>>), 200)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await forbiddenSvc.GetAllAsync(ct);
        return Ok(ApiResponse<List<ForbiddenCategoryResponse>>.Ok(result));
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ForbiddenCategoryResponse>), 201)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Create([FromBody] CreateForbiddenCategoryRequest req, CancellationToken ct)
    {
        var result = await forbiddenSvc.CreateAsync(req, CurrentUserId, ct);
        return StatusCode(201, ApiResponse<ForbiddenCategoryResponse>.Ok(result, "Đã thêm danh mục cấm."));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<ForbiddenCategoryResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateForbiddenCategoryRequest req, CancellationToken ct)
    {
        var result = await forbiddenSvc.UpdateAsync(id, req, ct);
        return Ok(ApiResponse<ForbiddenCategoryResponse>.Ok(result));
    }
}

[Route("api/exchange-rates")]
public class ExchangeRatesController(IExchangeRateService exchangeRateSvc) : Module1BaseController
{
    [HttpGet("current")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), 200)]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var result = await exchangeRateSvc.GetCurrentAsync(ct);
        return Ok(ApiResponse<ExchangeRateResponse>.Ok(result));
    }

    [HttpGet("history")]
    [Authorize(Policy = Permissions.ExchangeRateRead)]
    [ProducesResponseType(typeof(ApiResponse<List<ExchangeRateResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 30, CancellationToken ct = default)
    {
        var result = await exchangeRateSvc.GetHistoryAsync(limit, ct);
        return Ok(ApiResponse<List<ExchangeRateResponse>>.Ok(result));
    }

    [HttpPut]
    [Authorize(Policy = Permissions.ExchangeRateManage)]
    [ProducesResponseType(typeof(ApiResponse<ExchangeRateResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> Update([FromBody] UpdateExchangeRateRequest req, CancellationToken ct)
    {
        var result = await exchangeRateSvc.UpdateAsync(req, CurrentUserId, ct);
        return Ok(ApiResponse<ExchangeRateResponse>.Ok(result, "Tỉ giá đã cập nhật."));
    }
}


// ─────────────────────────────────────────────────────────────────────────────
[Route("api/deposit-configs")]
public class DepositConfigsController(IDepositConfigService depositSvc) : Module1BaseController
{
    /// 
    /// Tất cả config cọc.
    /// Quyền: Staff trở lên — khách không cần xem toàn bộ, chỉ cần xem /active.
    /// 
    [HttpGet]
    [Authorize(Policy = Permissions.ExchangeRateRead)]
    [ProducesResponseType(typeof(ApiResponse<List<DepositConfigResponse>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await depositSvc.GetAllAsync(ct);
        return Ok(ApiResponse<List<DepositConfigResponse>>.Ok(result));
    }

    /// Config cọc đang áp dụng cho khách — public (cần trước khi tạo đơn).
    [HttpGet("active")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<DepositConfigResponse>), 200)]
    public async Task<IActionResult> GetActive([FromQuery] Guid? vipTierId, CancellationToken ct)
    {
        var result = await depositSvc.GetActiveForCustomerAsync(vipTierId, ct);
        return Ok(ApiResponse<DepositConfigResponse>.Ok(result));
    }
}