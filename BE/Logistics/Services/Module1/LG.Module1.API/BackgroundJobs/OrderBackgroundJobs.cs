using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LG.Module1.API.BackgroundJobs;

/// Tự động hủy đơn PendingPayment quá 30 phút chưa đóng cọc.
/// Chạy mỗi 60 giây.
public class OrderTimeoutJob(
    IServiceScopeFactory scopeFactory,
    ILogger<OrderTimeoutJob> logger
) : BackgroundService
{
    private const int TimeoutMinutes   = 30;
    private const int IntervalSeconds  = 60;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("OrderTimeoutJob started (interval: {Interval}s, timeout: {Timeout} min)",
            IntervalSeconds, TimeoutMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessTimeoutsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "OrderTimeoutJob failed during execution");
            }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task ProcessTimeoutsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var orderRepo = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();
        var uow       = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var timedOut = await orderRepo.GetTimedOutPendingOrdersAsync(TimeoutMinutes, ct);
        if (timedOut.Count == 0) return;

        logger.LogInformation("OrderTimeoutJob: found {Count} timed-out orders", timedOut.Count);

        foreach (var order in timedOut)
        {
            try
            {
                order.CancelByTimeout();
                await orderRepo.UpdateAsync(order, ct);
                logger.LogInformation("Auto-cancelled timed-out order {OrderCode}", order.OrderCode);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to cancel order {OrderCode}", order.OrderCode);
            }
        }

        await uow.SaveChangesAsync(ct);
    }
}

/// Tự động assign đơn đã Paid cho NV ít việc nhất.
/// Chạy mỗi 30 giây.
public class OrderAssignmentJob(
    IServiceScopeFactory scopeFactory,
    ILogger<OrderAssignmentJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 30;
    private const int BatchSize       = 20;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("OrderAssignmentJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessAssignmentsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "OrderAssignmentJob failed during execution");
            }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task ProcessAssignmentsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var orderRepo = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();

        var unassigned = await orderRepo.GetUnassignedPaidOrdersAsync(BatchSize, ct);
        if (unassigned.Count == 0) return;

        // Log found orders, manual assign via API until Phase 8 provides staff roster
        logger.LogInformation(
            "OrderAssignmentJob: {Count} paid orders awaiting staff assignment (manual assign via /api/manage/orders/{{id}}/assign)",
            unassigned.Count);

        // Future Phase 8: pull available staff list from Auth service, round-robin or load-balance
    }
}
