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
            ForbiddenProductException e      => (422, e.Code, e.Message),
            InvalidOrderTransitionException e => (422, e.Code, e.Message),
            ProductNotFoundException e        => (404, e.Code, e.Message),
            InvalidQuantityException e        => (400, e.Code, e.Message),
            InsufficientStockException e      => (409, e.Code, e.Message),
            PlatformNotFoundException e       => (404, e.Code, e.Message),
            Module1DomainException e          => (400, e.Code, e.Message),
            InvalidOperationException e       => (400, "INVALID_OPERATION", e.Message),
            ArgumentException e               => (400, "BAD_REQUEST", e.Message),
            _                                 => (500, "INTERNAL_ERROR", "Đã xảy ra lỗi không mong muốn.")
        };

        if (status == 500) logger.LogError(ex, "Unhandled exception");
        else               logger.LogWarning(ex, "Domain exception: {Code}", code);

        ctx.Response.StatusCode  = status;
        ctx.Response.ContentType = "application/json";
        await ctx.Response.WriteAsync(
            JsonSerializer.Serialize(ApiResponse.Fail(message, code), JsonOpts));
    }
}
