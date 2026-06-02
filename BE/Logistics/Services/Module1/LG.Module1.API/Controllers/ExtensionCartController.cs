using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Module1.API.Controllers;

// Endpoint dành cho Chrome Extension (browse Taobao/1688/Tmall/Rakuten → click "Thêm giỏ").
// Khác CartController.AddItem ở chỗ: nhận RAW scraped payload và tự lookup/upsert product trước.
[Route("api/cart")]
public class ExtensionCartController(IExtensionCartService svc) : Module1BaseController
{
    [HttpPost("add-from-extension")]
    [Authorize(Policy = Permissions.CartManage)]
    [EnableRateLimiting("auth-sensitive")]   // 20 req/phút — chống spam click "Thêm giỏ"
    [ProducesResponseType(typeof(ApiResponse<AddFromExtensionResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> AddFromExtension(
        [FromBody] AddFromExtensionRequest req, CancellationToken ct)
    {
        var result = await svc.AddAsync(CurrentUserId, req, ct);
        return Ok(ApiResponse<AddFromExtensionResponse>.Ok(result, "Đã thêm vào giỏ hàng."));
    }

    [HttpGet("extension/health")]
    [AllowAnonymous]
    [ProducesResponseType(200)]
    public IActionResult Health() =>
        Ok(new { status = "ok", service = "muaho-extension-api", time = DateTime.UtcNow });
}
