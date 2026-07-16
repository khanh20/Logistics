using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LG.Module1.Infrastructure.Adapters;

// POST /api/v1/search/rerank {query, docs:[{id,text}]} -> {order:[...]}. Lỗi -> null.
public class HttpSearchReranker(HttpClient http, IConfiguration cfg, ILogger<HttpSearchReranker> logger)
    : LlmGatewayAdapterBase(http, cfg), ISearchReranker
{
    private sealed record DocDto(string id, string text);
    private sealed record RerankResponse(List<string>? order);

    public async Task<IReadOnlyList<Guid>?> RerankAsync(
        string query, IReadOnlyList<(Guid Id, string Text)> docs, CancellationToken ct = default)
    {
        if (docs.Count == 0) return Array.Empty<Guid>();
        try
        {
            var body = new { query, docs = docs.Select(d => new DocDto(d.Id.ToString(), d.Text)).ToList() };
            var resp = await PostJsonAsync<RerankResponse>("/api/v1/search/rerank", body, ct);
            return ParseGuidsOrNull(resp?.order);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Search reranker unavailable — giữ thứ tự RRF.");
            return null;
        }
    }
}
