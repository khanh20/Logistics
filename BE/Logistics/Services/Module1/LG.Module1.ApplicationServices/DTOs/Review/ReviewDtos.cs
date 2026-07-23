using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Review;

public record SubmitReviewRequest(
    [Range(1, 5)] int Rating,
    [Required, MaxLength(2000)] string Content
);

public record ReviewResponse(
    Guid         Id,
    Guid         ProductId,
    Guid         CustomerId,
    int          Rating,
    string       Content,
    ReviewStatus Status,
    string?      RejectReason,
    DateTime     CreatedAt,
    double?      AiSpamScore,
    DateTime?    AiScannedAt
);

public record PagedReviewResponse(
    List<ReviewResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);

// approve=true → duyệt; approve=false → từ chối (kèm reason).
public record ModerateReviewRequest(
    bool Approve,
    [MaxLength(500)] string? Reason = null
);

public static class ReviewMapper
{
    public static ReviewResponse ToResponse(ProductReview r) => new(
        r.Id, r.ProductId, r.CustomerId, r.Rating, r.Content,
        r.Status, r.RejectReason, r.CreatedAt, r.AiSpamScore, r.AiScannedAt);
}
