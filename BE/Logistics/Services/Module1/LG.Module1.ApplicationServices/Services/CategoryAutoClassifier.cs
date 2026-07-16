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
    // model lỗi/không chắc -> category active đầu tiên.
    public async Task<Guid> ResolveAsync(Guid? explicitId, string? title, string? imageUrl,
        string? originalCategory, CancellationToken ct = default)
    {
        if (explicitId.HasValue) return explicitId.Value;

        var cats = await GetActiveAsync(ct);
        if (cats.Count == 0)
            throw new InvalidOperationException("Không có category nào active.");

        try
        {
            var predicted = await classifier.PredictCategoryAsync(
                title, imageUrl, originalCategory,
                cats.Select(c => (c.Id, (string?)c.NameVn, c.NameCn)).ToList(), ct);
            if (predicted is { } id && cats.Any(c => c.Id == id))
            {
                logger.LogInformation("Auto-classified '{Title}' → {Cat}", title, id);
                return id;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Category classifier unavailable — dùng category mặc định.");
        }
        return cats[0].Id;
    }

    private async Task<List<ProductCategory>> GetActiveAsync(CancellationToken ct) =>
        _cache ??= await categoryRepo.GetAllAsync(activeOnly: true, ct);
}
