namespace LG.Authentication.API.Middleware;

// Thêm các security headers chuẩn OWASP cho mọi response.
// Áp dụng trước UseAuthentication để cả response auth-fail cũng có headers.
public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var headers = ctx.Response.Headers;

        ctx.Response.OnStarting(() =>
        {
            // Chặn MIME-sniffing
            if (!headers.ContainsKey("X-Content-Type-Options"))
                headers["X-Content-Type-Options"] = "nosniff";

            // Chặn clickjacking
            if (!headers.ContainsKey("X-Frame-Options"))
                headers["X-Frame-Options"] = "DENY";

            // Giới hạn referrer leak
            if (!headers.ContainsKey("Referrer-Policy"))
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // Disable browser features không dùng
            if (!headers.ContainsKey("Permissions-Policy"))
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";

            // HSTS chỉ khi HTTPS
            if (ctx.Request.IsHttps && !headers.ContainsKey("Strict-Transport-Security"))
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

            // Xoá header lộ stack tech
            headers.Remove("Server");
            headers.Remove("X-Powered-By");

            return Task.CompletedTask;
        });

        await next(ctx);
    }
}
