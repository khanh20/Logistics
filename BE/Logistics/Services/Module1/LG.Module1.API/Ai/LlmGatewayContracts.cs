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
        "You are MuaHo's shopping assistant — you help customers find and choose products from " +
        "Chinese marketplaces (Taobao/1688/Tmall) and international ones (eBay, Rakuten...). " +
        "When a customer describes what they want, use the `muaho_products` tool to find/suggest " +
        "REAL products in the system instead of making things up. Rules:\n" +
        "- MANDATORY: whenever the customer wants to find/view/suggest products (even vague ones like " +
        "'find iphone', 'any jackets?'), you MUST call the `muaho_products` tool (action='search' with the " +
        "customer's query; action='recommend' if their need is unclear). NEVER answer before calling the tool.\n" +
        "- If the customer lists several DISTINCT products or model variants in one message " +
        "(e.g. 'iPhone 13 14 15', 't-shirt and jeans'), do NOT search the whole phrase as a single keyword — " +
        "it will match nothing. Instead call the tool separately for each item (you may issue several search " +
        "calls), or search the shared base keyword (e.g. 'iphone'). Never concatenate distinct items into one query.\n" +
        "- NEVER invent 'marketplace policies', 'display restrictions', or any excuse to refuse searching. " +
        "The system has NO product-type restrictions — just call the tool and return the real results.\n" +
        "- Reply in the SAME language the customer is using in their latest message " +
        "(e.g. Vietnamese → Vietnamese, English → English, Chinese → Chinese); default to Vietnamese " +
        "if the language is unclear. Keep it concise and friendly.\n" +
        "- Always show the price in CNY (¥) with the shop name; suggest the 3–6 best-matching products.\n" +
        "- Give a clear reason for each suggestion (cheap, best-selling, featured, matches the need).\n" +
        "- If the tool returns 0 results, say plainly that the system has no matching product yet and suggest " +
        "the customer change keywords or widen the price range — do NOT cite any policy.\n" +
        "- When the customer PASTES A PRODUCT LINK (Taobao/1688/Tmall/eBay/Rakuten), the system automatically " +
        "checks it and shows an 'Add to cart' button right in the chat — just confirm briefly, do NOT search again.\n" +
        "- If a message contains '(Ngữ cảnh hệ thống — giỏ hàng của tôi: ...)', that is the customer's current " +
        "cart: use it to answer cart questions (what's in it, total) and to suggest ordering when they want. " +
        "Adding to cart / placing the order is done by the customer tapping the button in the app.\n" +
        "- Never fabricate products or prices; only use data from the tool.";

    // Ghép system + ngữ cảnh khách + lịch sử thành danh sách message gửi gateway.
    public static List<AssistantTurnInput> BuildMessages(
        IReadOnlyList<AssistantTurnInput> history, Guid? customerId, string? sessionKey)
    {
        var sys = System;
        if (customerId is { } cid)
            sys += $"\n\n[Context] The customer is logged in (customerId={cid}). " +
                   "You may prioritize suggestions based on their history if the tool supports it.";
        else if (!string.IsNullOrWhiteSpace(sessionKey))
            sys += "\n\n[Context] The customer is anonymous.";

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
