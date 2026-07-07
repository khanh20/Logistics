using LG.Module1.ApplicationServices.DTOs.Review;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Module1.API.Controllers;

// ── Customer reviews ─────────────────────────────────────────────────────────
[Route("api/products/{productId:guid}/reviews")]
public class ProductReviewController(IReviewService reviews) : Module1BaseController
{
    /// Đánh giá đã duyệt của sản phẩm (công khai).
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    [ProducesResponseType(typeof(ApiResponse<PagedReviewResponse>), 200)]
    public async Task<IActionResult> GetApproved(
        Guid productId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await reviews.GetApprovedByProductAsync(productId, page, pageSize, ct);
        return Ok(ApiResponse<PagedReviewResponse>.Ok(result));
    }

    /// Đánh giá của chính khách cho sản phẩm (gồm Pending) — để FE biết đã gửi chưa.
    [HttpGet("mine")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ReviewResponse>), 200)]
    public async Task<IActionResult> GetMine(Guid productId, CancellationToken ct)
    {
        var result = await reviews.GetMineForProductAsync(CurrentUserId, productId, ct);
        return Ok(ApiResponse<ReviewResponse?>.Ok(result));
    }

    /// Gửi đánh giá — chỉ khi đã mua; trạng thái Pending chờ duyệt.
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ReviewResponse>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Submit(Guid productId, [FromBody] SubmitReviewRequest req, CancellationToken ct)
    {
        var result = await reviews.SubmitAsync(CurrentUserId, productId, req, ct);
        return StatusCode(201, ApiResponse<ReviewResponse>.Ok(result, "Đã gửi đánh giá, chờ duyệt."));
    }
}

// ── Moderation (Admin/Staff) ─────────────────────────────────────────────────
[Route("api/manage/reviews")]
[Authorize(Policy = Permissions.ReviewModerate)]
public class ReviewModerationController(IReviewService reviews) : Module1BaseController
{
    /// Hàng đợi kiểm duyệt (mặc định Pending).
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedReviewResponse>), 200)]
    public async Task<IActionResult> GetQueue(
        [FromQuery] ReviewStatus? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await reviews.GetQueueAsync(status, page, pageSize, ct);
        return Ok(ApiResponse<PagedReviewResponse>.Ok(result));
    }

    /// Duyệt / từ chối 1 đánh giá.
    [HttpPatch("{reviewId:guid}/moderate")]
    [ProducesResponseType(typeof(ApiResponse<ReviewResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Moderate(Guid reviewId, [FromBody] ModerateReviewRequest req, CancellationToken ct)
    {
        var result = await reviews.ModerateAsync(reviewId, CurrentUserId, req, ct);
        return Ok(ApiResponse<ReviewResponse>.Ok(result, req.Approve ? "Đã duyệt." : "Đã từ chối."));
    }
}
