using System.Text.Json;
using LG.Module1.Domain.Exceptions;
using LG.Shared.Constants;

namespace LG.Module1.API.Middleware;

public class Module1ExceptionMiddleware(RequestDelegate next, ILogger<Module1ExceptionMiddleware> logger)
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
            InvalidOperationException e => (400, "INVALID_OPERATION", e.Message),
            ArgumentException e => (400, "BAD_REQUEST", e.Message),
            _ => (500, "INTERNAL_ERROR", "Đã xảy ra lỗi không mong muốn.")
        };

        if (status >= 500) logger.LogError(ex, "Server-side exception: {Code}", code);
        else logger.LogWarning(ex, "Client/domain exception: {Code}", code);

        // Set Retry-After header cho 429
        if (ex is AdapterRateLimitException rl && rl.RetryAfterSeconds.HasValue)
            ctx.Response.Headers["Retry-After"] = rl.RetryAfterSeconds.Value.ToString();

        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(
            JsonSerializer.Serialize(ApiResponse.Fail(message, code), JsonOpts));
    }
}