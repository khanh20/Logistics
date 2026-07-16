namespace LG.Module1.Domain.Adapters;

// Rerank kết quả tìm kiếm bằng cross-encoder bên serving_pipeline.
public interface ISearchReranker
{
    // Trả thứ tự productId đã sắp lại; null nếu service lỗi (caller giữ thứ tự RRF).
    Task<IReadOnlyList<Guid>?> RerankAsync(
        string query,
        IReadOnlyList<(Guid Id, string Text)> docs,
        CancellationToken ct = default);
}
