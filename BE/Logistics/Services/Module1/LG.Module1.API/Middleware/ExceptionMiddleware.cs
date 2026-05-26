using System.Text.Json;
using LG.Module1.Domain.Exceptions;
using LG.Shared.Constants;

namespace LG.Module1.API.Middleware;

public class Module1ExceptionMiddleware(
    RequestDelegate next,
    ILogger<Module1ExceptionMiddleware> logger,
    IHostEnvironment env)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (Exception ex) { await HandleAsync(ctx, ex); }
    }

    private async Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, code, message) = ex switch
        {
            ForbiddenProductException e => (422, e.Code, e.Message),
            InvalidOrderTransitionException e => (422, e.Code, e.Message),
            ProductNotFoundException e => (404, e.Code, e.Message),
            InvalidQuantityException e => (400, e.Code, e.Message),
            InsufficientStockException e => (409, e.Code, e.Message),
            PlatformNotFoundException e => (404, e.Code, e.Message),

            // Adapter exceptions
            AdapterRateLimitException e => (429, e.Code, e.Message),
            AdapterAuthException e => (502, e.Code, e.Message),
            AdapterNotFoundException e => (404, e.Code, e.Message),
            AdapterTimeoutException e => (504, e.Code, e.Message),
            AdapterNotConfiguredException e => (503, e.Code, e.Message),
            AdapterUpstreamException e => (502, e.Code, e.Message),

            Module1DomainException e => (400, e.Code, e.Message),

            // Operation/Argument exception là client error nhưng message có thể leak
            // internal info (path, field name nội bộ) → mask trong production.
            InvalidOperationException => (400, "INVALID_OPERATION",
                env.IsDevelopment() ? ex.Message : "Yêu cầu không hợp lệ."),
            ArgumentException => (400, "BAD_REQUEST",
                env.IsDevelopment() ? ex.Message : "Tham số không hợp lệ."),

            // Unhandled — luôn mask message khi production
            _ => (500, "INTERNAL_ERROR",
                env.IsDevelopment() ? ex.Message : "Đã xảy ra lỗi không mong muốn.")
        };

        if (status >= 500) logger.LogError(ex, "Server-side exception: {Code} on {Path}", code, ctx.Request.Path);
        else logger.LogWarning(ex, "Client/domain exception: {Code} on {Path}", code, ctx.Request.Path);

        // Set Retry-After header cho 429
        if (ex is AdapterRateLimitException rl && rl.RetryAfterSeconds.HasValue)
            ctx.Response.Headers["Retry-After"] = rl.RetryAfterSeconds.Value.ToString();

        // Tránh ghi response nếu pipeline đã ghi rồi (vd file streaming đã start)
        if (ctx.Response.HasStarted) return;

        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(
            JsonSerializer.Serialize(ApiResponse.Fail(message, code), JsonOpts));
    }
}