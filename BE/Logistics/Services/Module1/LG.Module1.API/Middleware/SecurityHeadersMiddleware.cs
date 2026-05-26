namespace LG.Module1.API.Middleware;

// Thêm các security headers chuẩn OWASP cho mọi response.
// Áp dụng trước UseAuthentication để cả response auth-fail cũng có headers.
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var headers = ctx.Response.Headers;

        // Set headers TRƯỚC khi response bắt đầu
        ctx.Response.OnStarting(() =>
        {
            // Chặn MIME-sniffing — browser phải tôn trọng Content-Type server gửi
            if (!headers.ContainsKey("X-Content-Type-Options"))
                headers["X-Content-Type-Options"] = "nosniff";

            // Chặn clickjacking — không cho frame trang vào site khác
            if (!headers.ContainsKey("X-Frame-Options"))
                headers["X-Frame-Options"] = "DENY";

            // Chặn referrer leak — chỉ gửi origin (không full URL) khi navigate cross-origin
            if (!headers.ContainsKey("Referrer-Policy"))
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // Disable browser features mặc định không dùng (camera, mic, geolocation, ...)
            if (!headers.ContainsKey("Permissions-Policy"))
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";

            // HSTS — chỉ set khi HTTPS để tránh lock browser khi dev HTTP
            if (ctx.Request.IsHttps && !headers.ContainsKey("Strict-Transport-Security"))
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

            // Xoá header lộ stack tech (Server, X-Powered-By)
            headers.Remove("Server");
            headers.Remove("X-Powered-By");

            return Task.CompletedTask;
        });

        await next(ctx);
    }
}
