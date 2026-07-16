namespace LG.Module1.Domain.Adapters;

// Rerank gợi ý bằng model học máy bên serving_pipeline.
public interface IRecoReranker
{
    // Rerank NHIỀU section trong một lượt gọi. Key -> thứ tự productId mới.
    // Null nếu service lỗi/chưa có model active (caller dùng rank linear cũ).
    Task<IReadOnlyDictionary<string, IReadOnlyList<Guid>>?> RerankAsync(
        Guid customerId,
        IReadOnlyList<(string Key, IReadOnlyList<Guid> CandidateIds)> sections,
        CancellationToken ct = default);
}
