using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LG.Module1.Infrastructure.Adapters;

// POST /api/v1/reco/rerank — batch nhiều section một lượt. 503 = chưa có model -> null.
public class HttpRecoReranker(HttpClient http, IConfiguration cfg, ILogger<HttpRecoReranker> logger)
    : LlmGatewayAdapterBase(http, cfg), IRecoReranker
{
    private sealed record SectionDto(string key, List<string> candidate_ids);
    private sealed record RankedSection(string key, List<string> ordered_ids);
    private sealed record RerankResponse(string? model_version, List<RankedSection>? sections);

    public async Task<IReadOnlyDictionary<string, IReadOnlyList<Guid>>?> RerankAsync(
        Guid customerId,
        IReadOnlyList<(string Key, IReadOnlyList<Guid> CandidateIds)> sections,
        CancellationToken ct = default)
    {
        if (sections.Count == 0) return null;
        try
        {
            var body = new
            {
                customer_id = customerId.ToString(),
                session_key = (string?)null,
                sections = sections
                    .Select(s => new SectionDto(s.Key, s.CandidateIds.Select(x => x.ToString()).ToList()))
                    .ToList(),
            };
            var resp = await PostJsonAsync<RerankResponse>("/api/v1/reco/rerank", body, ct);
            if (resp?.sections is null || resp.sections.Count == 0) return null;

            var result = new Dictionary<string, IReadOnlyList<Guid>>();
            foreach (var s in resp.sections)
            {
                var ids = ParseGuidsOrNull(s.ordered_ids);
                if (ids is not null) result[s.key] = ids;
            }
            return result.Count > 0 ? result : null;
        }
        catch (Exception ex)
        {
            logger.LogInformation("Reco reranker unavailable ({Reason}) — dùng rank linear.", ex.Message);
            return null;
        }
    }
}
