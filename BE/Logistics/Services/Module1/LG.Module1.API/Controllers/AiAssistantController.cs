using System.Text;
using System.Text.Json;
using LG.Module1.API.Ai;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Module1.API.Controllers;

// Trợ lý mua hộ — proxy tới serving pipeline (Qwen/Gemini) qua ILlmGateway.
// Hai transport REST: SSE (stream interleaved) + JSON (non-stream).
// gRPC-web cho FE nằm ở AiAssistantGrpcService.
[Route("api/assistant")]
public class AiAssistantController(ILlmGateway gateway) : Module1BaseController
{
    public sealed record ChatMessageDto(string Role, string Content);
    public sealed record ChatRequest(List<ChatMessageDto>? Messages, string? SessionKey);

    // SSE: chữ chảy live + chip tool. FE đọc bằng fetch + ReadableStream.
    [HttpPost("chat/stream")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task ChatStream([FromBody] ChatRequest req, CancellationToken ct)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"]   = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";   // tắt buffering ở nginx

        var history = (req.Messages ?? [])
            .Select(m => new AssistantTurnInput(m.Role, m.Content)).ToList();

        try
        {
            await foreach (var ev in gateway.StreamAssistantAsync(history, TryGetUserId(), req.SessionKey, ct))
            {
                await Response.WriteAsync($"event: {ev.Type}\ndata: {ev.DataJson}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (OperationCanceledException) { /* client đóng kết nối */ }
        catch (Exception ex)
        {
            var payload = JsonSerializer.Serialize(new { message = ex.Message, recoverable = false });
            await Response.WriteAsync($"event: error\ndata: {payload}\n\n", ct);
            await Response.Body.FlushAsync(ct);
        }
    }

    // Non-stream: gom text + tool_result trả 1 JSON (cho client không stream).
    [HttpPost("chat")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    [ProducesResponseType(typeof(ApiResponse<AssistantAnswer>), 200)]
    public async Task<IActionResult> Chat([FromBody] ChatRequest req, CancellationToken ct)
    {
        var history = (req.Messages ?? [])
            .Select(m => new AssistantTurnInput(m.Role, m.Content)).ToList();

        var answer = new StringBuilder();
        var toolEvents = new List<string>();

        await foreach (var ev in gateway.StreamAssistantAsync(history, TryGetUserId(), req.SessionKey, ct))
        {
            switch (ev.Type)
            {
                case "token":       answer.Append(ev.Text); break;
                case "tool_result": toolEvents.Add(ev.DataJson); break;
            }
        }

        return Ok(ApiResponse<AssistantAnswer>.Ok(
            new AssistantAnswer(answer.ToString(), toolEvents)));
    }

    public sealed record AssistantAnswer(string Answer, List<string> ToolResults);

    private Guid? TryGetUserId()
    {
        var v = HttpContext.User.FindFirst(UserClaimTypes.UserId)?.Value;
        return Guid.TryParse(v, out var id) ? id : null;
    }
}
