using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using LG.Core.Domain.Exceptions;
using LG.Shared.Constants;
using LG.ApplicationBase.MapError;
using Microsoft.AspNetCore.Diagnostics;
using ValidationException = LG.Core.Domain.Exceptions.ValidationException;

namespace LG.Core.API.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger, IMapErrorCode mapErrorCode)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            await HandleAsync(ctx, ex);
        }
    }

    private async Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, code, message) = ex switch
        {
            CoreException e => (e.StatusCode, mapErrorCode.GetErrorMessageKey(e.ErrorCode), mapErrorCode.GetErrorMessage(e.ErrorCode)),
            NotFoundException e => (404, e.Code, e.Message),
            ConflictException e => (409, e.Code, e.Message),
            ValidationException e => (400, e.Code, e.Message),
            UnauthorizedException e => (401, e.Code, e.Message),
            ForbiddenException e => (403, e.Code, e.Message),
            InvalidTokenException e => (401, e.Code, e.Message),
            AccountLockedException e => (403, e.Code, e.Message),
            DomainException e => (400, e.Code, e.Message),
            _ => (500, "INTERNAL_ERROR", "An unexpected error occurred.")
        };

        if (status == 500)
            logger.LogError(ex, "Unhandled exception");
        else
            logger.LogWarning(ex, "Domain exception: {Code}", code);

        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";

        var body = JsonSerializer.Serialize(
            ApiResponse.Fail(message, code), JsonOpts);

        await ctx.Response.WriteAsync(body);
    }
}
