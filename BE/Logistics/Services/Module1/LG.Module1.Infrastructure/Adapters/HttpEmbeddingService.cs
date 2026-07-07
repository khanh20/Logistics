using System.Net.Http.Json;
using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;

namespace LG.Module1.Infrastructure.Adapters;

// Gọi service embedding kiểu HuggingFace TEI: POST {BaseUrl}/embed {"inputs":[...]} → float[][].
// Cấu hình: Embedding:BaseUrl, Embedding:Model. BaseAddress set qua AddHttpClient.
public class HttpEmbeddingService : IEmbeddingProvider
{
    private readonly HttpClient _http;

    public string ModelName { get; }

    public HttpEmbeddingService(HttpClient http, IConfiguration config)
    {
        _http     = http;
        ModelName = config["Embedding:Model"] ?? "Qwen/Qwen3-Embedding-0.6B";
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var res = await EmbedBatchAsync(new[] { text }, ct);
        return res.Count > 0 ? res[0] : Array.Empty<float>();
    }

    public async Task<IReadOnlyList<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (texts.Count == 0) return Array.Empty<float[]>();

        var resp = await _http.PostAsJsonAsync("/embed", new { inputs = texts }, ct);
        resp.EnsureSuccessStatusCode();

        var vectors = await resp.Content.ReadFromJsonAsync<float[][]>(cancellationToken: ct);
        return vectors ?? Array.Empty<float[]>();
    }
}
