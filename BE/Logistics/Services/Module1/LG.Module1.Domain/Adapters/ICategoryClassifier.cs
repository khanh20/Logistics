namespace LG.Module1.Domain.Adapters;

// Phân loại category sản phẩm (text + ảnh) bên serving_pipeline, dùng lúc ingest.
public interface ICategoryClassifier
{
    // Null nếu service lỗi hoặc không đủ tự tin (caller fallback category mặc định).
    Task<Guid?> PredictCategoryAsync(
        string? title,
        string? imageUrl,
        string? originalCategory,
        IReadOnlyList<(Guid Id, string? NameVn, string? NameCn)> categories,
        CancellationToken ct = default);
}
