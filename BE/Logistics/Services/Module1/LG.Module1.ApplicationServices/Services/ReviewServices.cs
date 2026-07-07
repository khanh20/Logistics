using LG.Module1.ApplicationServices.DTOs.Review;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;

namespace LG.Module1.ApplicationServices.Services;

// Đánh giá sản phẩm + kiểm duyệt (Plan E).
public class ReviewService(
    IProductReviewRepository reviewRepo,
    IProductRepository       productRepo,
    ICustomerOrderRepository orderRepo,
    IModule1UnitOfWork       uow
) : IReviewService
{
    public async Task<ReviewResponse> SubmitAsync(
        Guid customerId, Guid productId, SubmitReviewRequest req, CancellationToken ct = default)
    {
        var product = await productRepo.GetByIdAsync(productId, ct)
                      ?? throw new ProductNotFoundException(productId);

        if (await reviewRepo.ExistsForCustomerAsync(productId, customerId, ct))
            throw new ReviewNotAllowedException("Bạn đã đánh giá sản phẩm này rồi.");

        if (!await orderRepo.HasPurchasedProductAsync(customerId, productId, ct))
            throw new ReviewNotAllowedException("Bạn chỉ có thể đánh giá sản phẩm đã mua.");

        var review = ProductReview.Create(product.Id, customerId, req.Rating, req.Content);
        await reviewRepo.AddAsync(review, ct);
        await uow.SaveChangesAsync(ct);
        return ReviewMapper.ToResponse(review);
    }

    public async Task<PagedReviewResponse> GetApprovedByProductAsync(
        Guid productId, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await reviewRepo.GetByProductAsync(productId, ReviewStatus.Approved, page, pageSize, ct);
        return Page(items, page, pageSize, total);
    }

    public async Task<ReviewResponse?> GetMineForProductAsync(
        Guid customerId, Guid productId, CancellationToken ct = default)
    {
        var r = await reviewRepo.GetByProductAndCustomerAsync(productId, customerId, ct);
        return r is null ? null : ReviewMapper.ToResponse(r);
    }

    public async Task<PagedReviewResponse> GetQueueAsync(
        ReviewStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await reviewRepo.SearchAsync(status ?? ReviewStatus.Pending, page, pageSize, ct);
        return Page(items, page, pageSize, total);
    }

    public async Task<ReviewResponse> ModerateAsync(
        Guid reviewId, Guid staffId, ModerateReviewRequest req, CancellationToken ct = default)
    {
        var review = await reviewRepo.GetByIdAsync(reviewId, ct)
                     ?? throw new ReviewNotFoundException(reviewId);

        if (req.Approve)
            review.Approve(staffId);
        else
            review.Reject(staffId, req.Reason ?? "Không phù hợp.");

        await reviewRepo.UpdateAsync(review, ct);
        await uow.SaveChangesAsync(ct);
        return ReviewMapper.ToResponse(review);
    }

    private static PagedReviewResponse Page(List<ProductReview> items, int page, int pageSize, int total) =>
        new(items.Select(ReviewMapper.ToResponse).ToList(),
            page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
}
