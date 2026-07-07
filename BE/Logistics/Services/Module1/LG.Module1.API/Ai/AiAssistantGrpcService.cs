using Grpc.Core;
using LG.Module1.API.Grpc;
using LG.Shared.Constants;

namespace LG.Module1.API.Ai;

// gRPC-web server cho FE (AssistantWidget transport=grpc). Cùng nội dung như SSE.
// AllowAnonymous: đọc customerId từ JWT nếu có (không bắt buộc).
public sealed class AiAssistantGrpcService(ILlmGateway gateway) : AssistantService.AssistantServiceBase
{
    public override async Task StreamAssistant(
        AssistantRequest request,
        IServerStreamWriter<Grpc.AssistantEvent> responseStream,
        ServerCallContext context)
    {
        var ct = context.CancellationToken;
        var history = request.Messages
            .Select(m => new AssistantTurnInput(m.Role, m.Content)).ToList();

        Guid? customerId = null;
        var user = context.GetHttpContext()?.User;
        var v = user?.FindFirst(UserClaimTypes.UserId)?.Value;
        if (Guid.TryParse(v, out var id)) customerId = id;

        await foreach (var ev in gateway.StreamAssistantAsync(history, customerId, request.SessionKey, ct))
        {
            await responseStream.WriteAsync(new Grpc.AssistantEvent
            {
                Type     = ev.Type,
                DataJson = ev.DataJson,
                Text     = ev.Text,
            });
        }
    }
}
