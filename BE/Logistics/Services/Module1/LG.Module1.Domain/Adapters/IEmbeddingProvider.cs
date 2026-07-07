namespace LG.Module1.Domain.Adapters;

// Cổng sinh embedding (Plan G). Impl gọi service embedding đa ngữ (TEI/Qwen3-Embedding-0.6B).
// Tách interface để có thể đổi model/nhà cung cấp mà không sửa lõi.
public interface IEmbeddingProvider
{
    /// Tên model đang dùng (lưu kèm vector để biết nguồn).
    string ModelName { get; }

    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);

    /// Embed theo lô — dùng cho backfill (hiệu quả hơn gọi từng cái).
    Task<IReadOnlyList<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default);
}
