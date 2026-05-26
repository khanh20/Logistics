using System.Text.Json;
using LG.Module2.Domain.Exceptions;
using LG.Shared.Constants;

namespace LG.Module2.API.Middleware;

public class Module2ExceptionMiddleware(
    RequestDelegate next,
    ILogger<Module2ExceptionMiddleware> logger,
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
            PackageNotFoundException e          => (404, e.Code, e.Message),
            SackNotFoundException e             => (404, e.Code, e.Message),
            ContainerTripNotFoundException e    => (404, e.Code, e.Message),
            WarehouseNotFoundException e        => (404, e.Code, e.Message),
            DeliveryRequestNotFoundException e  => (404, e.Code, e.Message),
            DomesticCarrierNotFoundException e  => (404, e.Code, e.Message),
            MissingClaimNotFoundException e     => (404, e.Code, e.Message),
            InsuranceClaimNotFoundException e   => (404, e.Code, e.Message),
            ChinaWaybillNotFoundException e     => (404, e.Code, e.Message),

            DuplicateBarcodeException e         => (409, e.Code, e.Message),
            PackageAlreadyInSackException e     => (409, e.Code, e.Message),
            SackSealedException e               => (422, e.Code, e.Message),
            SackMixedFragileException e         => (422, e.Code, e.Message),
            InvalidPackageTransitionException e => (422, e.Code, e.Message),
            PackageWeightExceededException e    => (422, e.Code, e.Message),
            WarehouseCapacityExceededException e => (422, e.Code, e.Message),
            WeightVarianceAlertException e      => (422, e.Code, e.Message),

            Module2DomainException e            => (400, e.Code, e.Message),

            InvalidOperationException => (400, "INVALID_OPERATION",
                env.IsDevelopment() ? ex.Message : "Yêu cầu không hợp lệ."),
            ArgumentException => (400, "BAD_REQUEST",
                env.IsDevelopment() ? ex.Message : "Tham số không hợp lệ."),
            UnauthorizedAccessException => (401, "UNAUTHORIZED", "Không có quyền truy cập."),

            _ => (500, "INTERNAL_ERROR",
                env.IsDevelopment() ? ex.Message : "Đã xảy ra lỗi không mong muốn.")
        };

        if (status >= 500) logger.LogError(ex, "Unhandled: {Code} on {Path}", code, ctx.Request.Path);
        else logger.LogWarning(ex, "Domain/client error: {Code} on {Path}", code, ctx.Request.Path);

        if (ctx.Response.HasStarted) return;
        ctx.Response.StatusCode  = status;
        ctx.Response.ContentType = "application/json";
        var body = JsonSerializer.Serialize(
            new { success = false, message, errorCode = code },
            JsonOpts);
        await ctx.Response.WriteAsync(body);
    }
}
