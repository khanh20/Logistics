using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LG.Module1.Infrastructure.Adapters;

// POST /api/v1/classify/category -> {category_id, score}. Lỗi/không chắc -> null.
public class HttpCategoryClassifier(HttpClient http, IConfiguration cfg, ILogger<HttpCategoryClassifier> logger)
    : LlmGatewayAdapterBase(http, cfg), ICategoryClassifier
{
    private sealed record CategoryDto(string id, string? name_vn, string? name_cn);
    private sealed record ClassifyResponse(string? category_id, double score);

    public async Task<Guid?> PredictCategoryAsync(
        string? title, string? imageUrl, string? originalCategory,
        IReadOnlyList<(Guid Id, string? NameVn, string? NameCn)> categories,
        CancellationToken ct = default)
    {
        if (categories.Count == 0) return null;
        try
        {
            var body = new
            {
                title,
                image_url = imageUrl,
                original_category = originalCategory,
                categories = categories.Select(c => new CategoryDto(c.Id.ToString(), c.NameVn, c.NameCn)).ToList(),
            };
            var resp = await PostJsonAsync<ClassifyResponse>("/api/v1/classify/category", body, ct);
            return resp?.category_id is not null && Guid.TryParse(resp.category_id, out var g) ? g : null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Category classifier unavailable.");
            return null;
        }
    }
}
