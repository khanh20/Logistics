using System.Net.Http.Json;
using LG.Module1.Domain.Adapters;
using Microsoft.Extensions.Configuration;

namespace LG.Module1.Infrastructure.Adapters;

// Gọi service embedding: POST {BaseUrl}{Path} {"inputs":[...]} → float[][] (kiểu TEI).
// Mặc định trỏ tới serving_pipeline: path /api/v1/embed, auth X-API-Key = LlmGateway:ApiKey.
// Nếu dùng TEI riêng: đặt Embedding:Path=/embed và bỏ ApiKey. BaseAddress set qua AddHttpClient.
public class HttpEmbeddingService : IEmbeddingProvider
{
    private readonly HttpClient _http;
    private readonly string _path;
    private readonly string _apiKey;

    public string ModelName { get; }

    public HttpEmbeddingService(HttpClient http, IConfiguration config)
    {
        _http     = http;
        ModelName = config["Embedding:Model"] ?? "Qwen/Qwen3-Embedding-0.6B";
        // BaseUrl riêng (TEI standalone) -> mặc định /embed; dùng chung gateway -> /api/v1/embed.
        var ownBase = config["Embedding:BaseUrl"]
                   ?? Environment.GetEnvironmentVariable("EMBEDDING__BASEURL");
        _path     = config["Embedding:Path"] ?? (ownBase is null ? "/api/v1/embed" : "/embed");
        _apiKey   = config["LlmGateway:ApiKey"] ?? "";
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var res = await EmbedBatchAsync(new[] { text }, ct);
        return res.Count > 0 ? res[0] : Array.Empty<float>();
    }

    public async Task<IReadOnlyList<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (texts.Count == 0) return Array.Empty<float[]>();

        using var reqMsg = new HttpRequestMessage(HttpMethod.Post, _path)
        {
            Content = JsonContent.Create(new { inputs = texts }),
        };
        if (!string.IsNullOrEmpty(_apiKey)) reqMsg.Headers.Add("X-API-Key", _apiKey);

        using var resp = await _http.SendAsync(reqMsg, ct);
        resp.EnsureSuccessStatusCode();

        var vectors = await resp.Content.ReadFromJsonAsync<float[][]>(cancellationToken: ct);
        return vectors ?? Array.Empty<float[]>();
    }
}
