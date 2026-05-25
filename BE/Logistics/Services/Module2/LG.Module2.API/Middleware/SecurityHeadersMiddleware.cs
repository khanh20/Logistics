namespace LG.Module2.API.Middleware;

public class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        ctx.Response.OnStarting(() =>
        {
            var h = ctx.Response.Headers;
            if (!h.ContainsKey("X-Content-Type-Options"))  h["X-Content-Type-Options"] = "nosniff";
            if (!h.ContainsKey("X-Frame-Options"))          h["X-Frame-Options"]         = "DENY";
            if (!h.ContainsKey("Referrer-Policy"))          h["Referrer-Policy"]          = "strict-origin-when-cross-origin";
            if (!h.ContainsKey("Permissions-Policy"))       h["Permissions-Policy"]       = "camera=(), microphone=(), geolocation=(), payment=()";
            if (ctx.Request.IsHttps && !h.ContainsKey("Strict-Transport-Security"))
                h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            h.Remove("Server");
            h.Remove("X-Powered-By");
            return Task.CompletedTask;
        });
        await next(ctx);
    }
}
