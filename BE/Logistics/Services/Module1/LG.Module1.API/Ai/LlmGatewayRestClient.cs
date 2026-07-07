using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;

namespace LG.Module1.API.Ai;

// .NET → Python qua REST SSE (POST /api/v1/llm/chat/completions, stream=true,
// agent_mode=true). Auth header X-API-Key. Mặc định cho ngrok/Colab (HTTP/1.1).
// Đọc body theo block SSE `event:`/`data:` → GatewayEvent.
public sealed class LlmGatewayRestClient(IHttpClientFactory httpFactory, IConfiguration cfg) : ILlmGateway
{
    private readonly string _baseUrl = (cfg["LlmGateway:BaseUrl"] ?? "http://localhost:8000").TrimEnd('/');
    private readonly string _apiKey  = cfg["LlmGateway:ApiKey"] ?? "";
    private readonly string _model   = cfg["LlmGateway:Model"] ?? "qwen2.5-7b-instruct";

    public async IAsyncEnumerable<GatewayEvent> StreamAssistantAsync(
        IReadOnlyList<AssistantTurnInput> history,
        Guid? customerId,
        string? sessionKey,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var messages = MuaHoAssistantPrompt.BuildMessages(history, customerId, sessionKey)
            .Select(m => new { role = m.Role, content = m.Content });

        var body = JsonSerializer.Serialize(new
        {
            model        = _model,
            stream       = true,
            agent_mode   = true,
            agent_config = new { allowed_tools = new[] { "muaho_products" }, max_iterations = 8 },
            messages,
        });

        using var reqMsg = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/api/v1/llm/chat/completions")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        reqMsg.Headers.TryAddWithoutValidation("X-API-Key", _apiKey);
        reqMsg.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        var http = httpFactory.CreateClient("llm-gateway");
        using var resp = await http.SendAsync(reqMsg, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();

        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        var evType = "token";
        var data   = new StringBuilder();

        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;

            if (line.Length == 0)
            {
                // Hết một block SSE → phát.
                if (data.Length > 0)
                {
                    var json = data.ToString();
                    yield return ToEvent(evType, json);
                }
                evType = "token";
                data.Clear();
                continue;
            }

            if (line.StartsWith("event:", StringComparison.Ordinal))
                evType = line[6..].Trim();
            else if (line.StartsWith("data:", StringComparison.Ordinal))
                data.Append(line[5..].TrimStart());
        }

        if (data.Length > 0)
            yield return ToEvent(evType, data.ToString());
    }

    private static GatewayEvent ToEvent(string type, string json)
    {
        if (type != "token") return new GatewayEvent(type, string.IsNullOrEmpty(json) ? "{}" : json);
        // token block: rút text từ {"text":"..."} để tiện gRPC-web.
        var text = "";
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("text", out var t)) text = t.GetString() ?? "";
        }
        catch (JsonException) { /* giữ text rỗng */ }
        return new GatewayEvent("token", json, text);
    }
}
