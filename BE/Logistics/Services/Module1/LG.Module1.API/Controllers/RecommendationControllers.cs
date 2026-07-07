using LG.Module1.ApplicationServices.DTOs.Product;
using LG.Module1.ApplicationServices.DTOs.Recommendation;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Module1.API.Controllers;

// ── Recommendation ───────────────────────────────────────────────────────────
[Route("api/recommendations")]
public class RecommendationController(IRecommendationService rec) : Module1BaseController
{
    /// Gợi ý theo phân khúc khách. AllowAnonymous: khách chưa đăng nhập vẫn nhận cold-start.
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    [ProducesResponseType(typeof(ApiResponse<RecommendationResponse>), 200)]
    public async Task<IActionResult> Get(
        [FromQuery] string? sessionKey, [FromQuery] int perSection = 12, CancellationToken ct = default)
    {
        var result = await rec.GetAsync(TryGetUserId(), sessionKey, perSection, ct);
        return Ok(ApiResponse<RecommendationResponse>.Ok(result));
    }

    private Guid? TryGetUserId()
    {
        var v = HttpContext.User.FindFirst(UserClaimTypes.UserId)?.Value;
        return Guid.TryParse(v, out var id) ? id : null;
    }
}

// ── Activity tracking ────────────────────────────────────────────────────────
[Route("api/activity")]
public class ActivityController(IEngagementService engagement) : Module1BaseController
{
    /// Ghi nhận hành vi (View/Search/...). Khách ẩn danh phải gửi sessionKey.
    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Track([FromBody] TrackActivityRequest req, CancellationToken ct)
    {
        var v   = HttpContext.User.FindFirst(UserClaimTypes.UserId)?.Value;
        Guid? cid = Guid.TryParse(v, out var id) ? id : null;
        if (cid is null && string.IsNullOrWhiteSpace(req.SessionKey))
            return BadRequest(ApiResponse.Fail("Cần đăng nhập hoặc gửi sessionKey."));

        await engagement.TrackAsync(cid, req, ct);
        return Ok(ApiResponse.Ok("Đã ghi nhận."));
    }
}

// ── Favorites ────────────────────────────────────────────────────────────────
[Route("api/favorites")]
[Authorize]
public class FavoriteController(IEngagementService engagement) : Module1BaseController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ProductListItemResponse>>), 200)]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var result = await engagement.GetFavoritesAsync(CurrentUserId, ct);
        return Ok(ApiResponse<List<ProductListItemResponse>>.Ok(result));
    }

    [HttpPost("{productId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    public async Task<IActionResult> Add(Guid productId, CancellationToken ct)
    {
        var added = await engagement.AddFavoriteAsync(CurrentUserId, productId, ct);
        return Ok(ApiResponse<bool>.Ok(added, added ? "Đã thêm yêu thích." : "Đã có trong yêu thích."));
    }

    [HttpDelete("{productId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<object?>), 200)]
    public async Task<IActionResult> Remove(Guid productId, CancellationToken ct)
    {
        await engagement.RemoveFavoriteAsync(CurrentUserId, productId, ct);
        return Ok(ApiResponse.Ok("Đã bỏ yêu thích."));
    }
}
