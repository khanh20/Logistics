using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// Điểm duy nhất quyết định category lúc ingest (crawl + extension đều dùng).
// Scoped: cache danh sách category cho cả vòng đời request/crawl.
public class CategoryAutoClassifier(
    IProductCategoryRepository categoryRepo,
    ICategoryClassifier classifier,
    ILogger<CategoryAutoClassifier> logger)
{
    private List<ProductCategory>? _cache;

    public async Task<Guid> ValidateAsync(Guid categoryId, CancellationToken ct = default)
    {
        var cat = await categoryRepo.GetByIdAsync(categoryId, ct)
                  ?? throw new ArgumentException($"Category '{categoryId}' không tồn tại.");
        return cat.Id;
    }

    // explicitId có -> dùng luôn (caller đã validate upfront). Không có -> model ML;
    // model lỗi/không chắc -> category active đầu tiên. (Luồng crawl — chạy nền, chặn được.)
    public async Task<Guid> ResolveAsync(Guid? explicitId, string? title, string? imageUrl,
        string? originalCategory, CancellationToken ct = default)
    {
        if (explicitId.HasValue) return explicitId.Value;

        var predicted = await PredictAsync(title, imageUrl, originalCategory, ct);
        if (predicted is { } id)
        {
            logger.LogInformation("Auto-classified '{Title}' → {Cat}", title, id);
            return id;
        }
        return await ResolveProvisionalAsync(null, ct);
    }

    // Category TẠM (nhanh, KHÔNG gọi ML): explicit hoặc category active đầu tiên.
    // Dùng cho luồng resolve-url của khách — classify thật chạy nền sau
    // (BackgroundCategoryClassifier) rồi cập nhật lại category cho đúng.
    public async Task<Guid> ResolveProvisionalAsync(Guid? explicitId, CancellationToken ct = default)
    {
        if (explicitId.HasValue) return explicitId.Value;
        var cats = await GetActiveAsync(ct);
        if (cats.Count == 0)
            throw new InvalidOperationException("Không có category nào active.");
        return cats[0].Id;
    }

    // Gọi model ML; trả category nếu đủ tự tin (đã validate thuộc danh sách active), null nếu không/lỗi.
    public async Task<Guid?> PredictAsync(string? title, string? imageUrl,
        string? originalCategory, CancellationToken ct = default)
    {
        var cats = await GetActiveAsync(ct);
        if (cats.Count == 0) return null;
        try
        {
            var predicted = await classifier.PredictCategoryAsync(
                title, imageUrl, originalCategory,
                cats.Select(c => (c.Id, (string?)c.NameVn, c.NameCn)).ToList(), ct);
            if (predicted is { } id && cats.Any(c => c.Id == id))
                return id;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Category classifier unavailable.");
        }
        return null;
    }

    private async Task<List<ProductCategory>> GetActiveAsync(CancellationToken ct) =>
        _cache ??= await categoryRepo.GetAllAsync(activeOnly: true, ct);
}
