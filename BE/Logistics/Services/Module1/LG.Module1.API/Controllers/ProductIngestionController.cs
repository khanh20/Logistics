using LG.Module1.ApplicationServices.DTOs.Ingestion;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Module1.API.Controllers;

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT INGESTION  —  /api/ingestion
//
// Tất cả endpoint yêu cầu product.manage (NV_MuaHang, Admin)
// ─────────────────────────────────────────────────────────────────────────────
[Route("api/ingestion")]
public class ProductIngestionController(IProductIngestionService ingestionService) : Module1BaseController
{
    
    /// Lấy danh sách platform mà hệ thống có adapter sẵn sàng.
    /// Quyền: Staff trở lên (platform.read).
    [HttpGet("platforms")]
    [Authorize(Policy = Permissions.PlatformRead)]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), 200)]
    public IActionResult GetAvailablePlatforms()
    {
        var list = ingestionService.GetAvailablePlatforms();
        return Ok(ApiResponse<List<string>>.Ok(list));
    }

    
    /// Crawl sản phẩm theo keyword trên 1 sàn cụ thể.
    /// Trả về thống kê chi tiết: bao nhiêu sản phẩm tìm được, lưu, bị flag cấm, skip.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPost("crawl/keyword")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<CrawlResultResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(429)]   // Rate limit
    [ProducesResponseType(502)]   // Upstream error
    public async Task<IActionResult> CrawlByKeyword(
        [FromBody] CrawlByKeywordRequest req,
        CancellationToken ct)
    {
        var result = await ingestionService.CrawlByKeywordAsync(req, ct);
        return Ok(ApiResponse<CrawlResultResponse>.Ok(result,
            $"Đã crawl {result.Saved}/{result.TotalFound} sản phẩm từ {result.PlatformName}."));
    }

    
    /// Crawl 1 sản phẩm từ URL gốc của sàn.
    /// Tự động detect platform từ domain.
    /// Quyền: NV_MuaHang, Admin (product.manage).
    [HttpPost("crawl/url")]
    [Authorize(Policy = Permissions.ProductManage)]
    [ProducesResponseType(typeof(ApiResponse<CrawlUrlResultResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    [ProducesResponseType(429)]
    [ProducesResponseType(502)]
    public async Task<IActionResult> CrawlByUrl(
        [FromBody] CrawlByUrlRequest req,
        CancellationToken ct)
    {
        var result = await ingestionService.CrawlByUrlAsync(req, ct);
        return Ok(ApiResponse<CrawlUrlResultResponse>.Ok(result));
    }

    /// Customer dán URL trên web → resolve thành ProductDetail để hiện popup chọn variant.
    /// Quyền: customer đã đăng nhập (cart.manage). Khác crawl/url (chỉ staff product.manage).
    [HttpPost("resolve-url")]
    [Authorize(Policy = Permissions.CartManage)]
    [EnableRateLimiting("auth-sensitive")]
    [ProducesResponseType(typeof(ApiResponse<ResolveUrlResponse>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> ResolveUrl(
        [FromBody] ResolveUrlRequest req,
        CancellationToken ct)
    {
        var result = await ingestionService.ResolveUrlForCustomerAsync(req, ct);
        return Ok(ApiResponse<ResolveUrlResponse>.Ok(result));
    }
}