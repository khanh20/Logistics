using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;

namespace LG.Module1.Infrastructure.Adapters;

// Base cho mọi adapter gọi serving_pipeline: gắn X-API-Key, POST JSON, parse response.
public abstract class LlmGatewayAdapterBase(HttpClient http, IConfiguration cfg)
{
    private readonly string _apiKey = cfg["LlmGateway:ApiKey"] ?? "";

    protected async Task<TResp?> PostJsonAsync<TResp>(string path, object body, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(body),
        };
        if (!string.IsNullOrEmpty(_apiKey)) req.Headers.Add("X-API-Key", _apiKey);

        using var resp = await http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadFromJsonAsync<TResp>(cancellationToken: ct);
    }

    // Parse danh sách id chuỗi -> Guid, bỏ phần tử hỏng; null nếu rỗng.
    protected static List<Guid>? ParseGuidsOrNull(IEnumerable<string>? ids)
    {
        if (ids is null) return null;
        var list = new List<Guid>();
        foreach (var s in ids)
            if (Guid.TryParse(s, out var g)) list.Add(g);
        return list.Count > 0 ? list : null;
    }
}
