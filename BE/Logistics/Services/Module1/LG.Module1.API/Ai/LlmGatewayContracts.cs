namespace LG.Module1.API.Ai;

// Hợp đồng tầng gateway AI: .NET proxy tới serving pipeline (Qwen/Gemini).
// Hai impl: gRPC (LlmGatewayGrpcClient) và REST SSE (LlmGatewayRestClient),
// chọn qua cấu hình LlmGateway:Transport. Cả hai trả cùng GatewayEvent stream.

// Một lượt hội thoại từ FE.
public sealed record AssistantTurnInput(string Role, string Content);

// Một sự kiện interleaved phát ra cho FE (khớp event của agent H1).
// Type: token | thinking | tool_call_start | tool_call | tool_result | done | error
public sealed record GatewayEvent(string Type, string DataJson, string Text = "");

public interface ILlmGateway
{
    // Stream câu trả lời của trợ lý (interleaved). customerId gắn từ JWT nếu có.
    IAsyncEnumerable<GatewayEvent> StreamAssistantAsync(
        IReadOnlyList<AssistantTurnInput> history,
        Guid? customerId,
        string? sessionKey,
        CancellationToken ct);
}

// System prompt cho trợ lý mua hộ — port từ serving_pipeline muaho_products.py
// để .NET tự gắn (giấu logic prompt, đính kèm ngữ cảnh khách).
public static class MuaHoAssistantPrompt
{
    public const string System =
        "Bạn là trợ lý mua hộ của MuaHo — giúp khách tìm và chọn sản phẩm từ các sàn " +
        "Trung Quốc (Taobao/1688/Tmall) và quốc tế (eBay...). " +
        "Khi khách mô tả nhu cầu, hãy dùng tool `muaho_products` để tìm/gợi ý sản phẩm thật " +
        "trong hệ thống thay vì bịa. Quy tắc:\n" +
        "- Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.\n" +
        "- Luôn nêu giá theo CNY (¥) kèm tên shop; gợi ý 3–6 sản phẩm phù hợp nhất.\n" +
        "- Nêu rõ lý do gợi ý (giá rẻ, bán chạy, nổi bật, đúng nhu cầu).\n" +
        "- Nếu không có kết quả, đề nghị khách đổi từ khoá hoặc nới khoảng giá.\n" +
        "- Không bao giờ bịa sản phẩm/giá; chỉ dùng dữ liệu từ tool.";

    // Ghép system + ngữ cảnh khách + lịch sử thành danh sách message gửi gateway.
    public static List<AssistantTurnInput> BuildMessages(
        IReadOnlyList<AssistantTurnInput> history, Guid? customerId, string? sessionKey)
    {
        var sys = System;
        if (customerId is { } cid)
            sys += $"\n\n[Ngữ cảnh] Khách đã đăng nhập (customerId={cid}). " +
                   "Có thể ưu tiên gợi ý theo lịch sử nếu tool hỗ trợ.";
        else if (!string.IsNullOrWhiteSpace(sessionKey))
            sys += "\n\n[Ngữ cảnh] Khách ẩn danh.";

        var msgs = new List<AssistantTurnInput> { new("system", sys) };
        foreach (var m in history)
        {
            var role = m.Role?.ToLowerInvariant() switch
            {
                "assistant" => "assistant",
                "system"    => "user",   // không cho client tiêm system riêng
                _           => "user",
            };
            if (!string.IsNullOrWhiteSpace(m.Content))
                msgs.Add(new AssistantTurnInput(role, m.Content));
        }
        return msgs;
    }
}
