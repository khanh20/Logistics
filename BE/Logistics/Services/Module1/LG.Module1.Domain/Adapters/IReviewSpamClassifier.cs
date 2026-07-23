namespace LG.Module1.Domain.Adapters;

// Lọc spam đánh giá. Chấm theo lô cho background job.
public interface IReviewSpamClassifier
{
    // Điểm spam (0..1) theo Id review. Service lỗi -> dictionary rỗng (job giữ nguyên, thử lại sau).
    Task<IReadOnlyDictionary<Guid, double>> ScoreAsync(
        IReadOnlyList<(Guid Id, string Content)> reviews,
        CancellationToken ct = default);
}
