using System.Runtime.CompilerServices;
using System.Text.Json;
using Chatbot.AI.LLM;
using Grpc.Core;
using Grpc.Net.Client;

namespace LG.Module1.API.Ai;

// .NET → Python qua gRPC streaming (StreamGenerate, agent_mode=true).
// Auth bằng metadata x-api-key. Tốt nhất khi gateway chạy cùng máy/LAN
// (ngrok free khó expose HTTP/2). Plaintext h2c bật qua AppContext switch.
public sealed class LlmGatewayGrpcClient : ILlmGateway, IDisposable
{
    private readonly GrpcChannel _channel;
    private readonly LLMService.LLMServiceClient _client;
    private readonly string _apiKey;
    private readonly string _model;

    public LlmGatewayGrpcClient(IConfiguration cfg)
    {
        var url = cfg["LlmGateway:GrpcUrl"] ?? "http://localhost:50052";
        // Cho phép HTTP/2 plaintext (h2c) khi gateway dùng http:// nội bộ.
        if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);

        _channel = GrpcChannel.ForAddress(url);
        _client  = new LLMService.LLMServiceClient(_channel);
        _apiKey  = cfg["LlmGateway:ApiKey"] ?? "";
        _model   = cfg["LlmGateway:Model"] ?? "qwen2.5-7b-instruct";
    }

    public async IAsyncEnumerable<GatewayEvent> StreamAssistantAsync(
        IReadOnlyList<AssistantTurnInput> history,
        Guid? customerId,
        string? sessionKey,
        [EnumeratorCancellation] CancellationToken ct)
    {
        var req = new GenerateRequest
        {
            Model       = _model,
            AgentMode   = true,
            AgentConfig = new AgentConfig { MaxIterations = 8 },
        };
        req.AgentConfig.AllowedTools.Add("muaho_products");
        foreach (var m in MuaHoAssistantPrompt.BuildMessages(history, customerId, sessionKey))
            req.Messages.Add(new ChatMessage { Role = m.Role, Content = m.Content });

        var headers = new Metadata { { "x-api-key", _apiKey } };
        using var call = _client.StreamGenerate(req, headers, cancellationToken: ct);

        await foreach (var tr in call.ResponseStream.ReadAllAsync(ct))
        {
            var type = string.IsNullOrEmpty(tr.EventType) ? "token" : tr.EventType;
            if (type == "token")
            {
                // gRPC token: text nằm ở field token, không có event_data_json.
                yield return new GatewayEvent(
                    "token",
                    JsonSerializer.Serialize(new { text = tr.Token }),
                    tr.Token);
            }
            else
            {
                yield return new GatewayEvent(
                    type,
                    string.IsNullOrEmpty(tr.EventDataJson) ? "{}" : tr.EventDataJson);
            }
        }
    }

    public void Dispose() => _channel.Dispose();
}
