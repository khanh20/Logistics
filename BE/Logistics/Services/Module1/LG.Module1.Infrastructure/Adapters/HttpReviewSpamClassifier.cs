using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LG.Module1.Infrastructure.Adapters;

// POST /api/v1/classify/review-spam -> {results:[{id, spam_score}]}. Lỗi -> rỗng.
public class HttpReviewSpamClassifier(HttpClient http, IConfiguration cfg, ILogger<HttpReviewSpamClassifier> logger)
    : LlmGatewayAdapterBase(http, cfg), IReviewSpamClassifier
{
    private sealed record ReviewItem(string id, string content);
    private sealed record ReviewSpamRequest(List<ReviewItem> reviews);
    private sealed record ResultItem(string id, double spam_score, bool is_spam);
    private sealed record ReviewSpamResponse(List<ResultItem>? results);

    public async Task<IReadOnlyDictionary<Guid, double>> ScoreAsync(
        IReadOnlyList<(Guid Id, string Content)> reviews, CancellationToken ct = default)
    {
        var empty = new Dictionary<Guid, double>();
        if (reviews.Count == 0) return empty;
        try
        {
            var body = new ReviewSpamRequest(
                reviews.Select(r => new ReviewItem(r.Id.ToString(), r.Content ?? "")).ToList());
            var resp = await PostJsonAsync<ReviewSpamResponse>("/api/v1/classify/review-spam", body, ct);
            if (resp?.results is null) return empty;

            var map = new Dictionary<Guid, double>(resp.results.Count);
            foreach (var r in resp.results)
                if (Guid.TryParse(r.id, out var g)) map[g] = r.spam_score;
            return map;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Review-spam classifier unavailable.");
            return empty;
        }
    }
}
