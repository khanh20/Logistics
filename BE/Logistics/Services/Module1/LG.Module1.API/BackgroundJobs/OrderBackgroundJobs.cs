using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
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
    private const int IntervalSeconds  = 500;

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
        var orderRepo   = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();
        var historyRepo = scope.ServiceProvider.GetRequiredService<IOrderStatusHistoryRepository>();
        var uow         = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var timedOut = await orderRepo.GetTimedOutPendingOrdersAsync(TimeoutMinutes, ct);
        if (timedOut.Count == 0) return;

        logger.LogInformation("OrderTimeoutJob: found {Count} timed-out orders", timedOut.Count);

        foreach (var order in timedOut)
        {
            try
            {
                order.CancelByTimeout();
                await historyRepo.AddAsync(order.History.Last(), ct);
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
    private const int IntervalSeconds = 500;
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
        using var scope          = scopeFactory.CreateScope();
        var orderRepo            = scope.ServiceProvider.GetRequiredService<ICustomerOrderRepository>();
        var assignmentService    = scope.ServiceProvider.GetRequiredService<IStaffAssignmentService>();
        var managementService    = scope.ServiceProvider.GetRequiredService<IOrderManagementService>();
        var rosterService        = scope.ServiceProvider.GetRequiredService<IStaffRosterService>();
        var uow                  = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var unassigned = await orderRepo.GetUnassignedPaidOrdersAsync(BatchSize, ct);
        if (unassigned.Count == 0) return;

        var staffIds = await rosterService.GetAvailableStaffAsync(ct);
        if (staffIds.Count == 0)
        {
            logger.LogWarning("OrderAssignmentJob: no available staff configured in StaffRoster:StaffIds");
            return;
        }

        logger.LogInformation("OrderAssignmentJob: {Count} paid orders, {Staff} staff available",
            unassigned.Count, staffIds.Count);

        foreach (var order in unassigned)
        {
            try
            {
                // 1. Chọn staff tốt nhất + tạo StaffAssignment record
                var assignment = await assignmentService.AutoAssignAsync(order.Id, staffIds, ct);
                if (assignment is null)
                {
                    logger.LogWarning("OrderAssignmentJob: could not auto-assign order {OrderCode}", order.OrderCode);
                    continue;
                }

                // 2. Chuyển trạng thái đơn → AwaitingManualPlace / AwaitingApiPlace
                await managementService.AssignOrderAsync(order.Id, assignment.StaffId, ct);

                logger.LogInformation(
                    "OrderAssignmentJob: order {OrderCode} assigned to staff {StaffId}, SLA={SlaDeadline:u}",
                    order.OrderCode, assignment.StaffId, assignment.SlaDeadline);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "OrderAssignmentJob: failed to assign order {OrderCode}", order.OrderCode);
            }
        }
    }
}

// ── SlaMonitorJob ─────────────────────────────────────────────────────────────
/// Chạy mỗi 5 phút. Đánh dấu IsOverdue = true cho assignment đã qua SlaDeadline.
public class SlaMonitorJob(
    IServiceScopeFactory scopeFactory,
    ILogger<SlaMonitorJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 300; // 5 phút

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("SlaMonitorJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ProcessExpiredAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "SlaMonitorJob failed during execution"); }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task ProcessExpiredAsync(CancellationToken ct)
    {
        using var scope        = scopeFactory.CreateScope();
        var assignmentRepo     = scope.ServiceProvider.GetRequiredService<IStaffAssignmentRepository>();
        var notifier           = scope.ServiceProvider.GetRequiredService<IStaffNotifier>();
        var uow                = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var expired = await assignmentRepo.GetPendingExpiredAsync(ct);
        if (expired.Count == 0) return;

        logger.LogWarning("SlaMonitorJob: {Count} assignments past SLA deadline", expired.Count);

        foreach (var a in expired)
        {
            a.MarkOverdue();
            await assignmentRepo.UpdateAsync(a, ct);
        }

        await uow.SaveChangesAsync(ct);

        // Thông báo cho NV về đơn quá hạn (sau khi đã lưu trạng thái).
        foreach (var a in expired)
        {
            try
            {
                await notifier.NotifyAsync(a.StaffId, StaffNotificationType.SlaOverdue,
                    "Đơn quá hạn SLA",
                    $"Đơn {a.Order?.OrderCode ?? a.OrderId.ToString()} đã quá hạn xử lý. Vui lòng xử lý gấp.",
                    a.OrderId, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "SlaMonitorJob: notify overdue staff {StaffId} failed", a.StaffId);
            }
        }

        logger.LogInformation("SlaMonitorJob: marked {Count} assignments as overdue", expired.Count);
    }
}

// ── StaffKpiAggregationJob ────────────────────────────────────────────────────
/// Chạy mỗi 15 phút. Tổng hợp KPI per-NV cho hôm nay + hôm qua (bắt completion trễ).
public class StaffKpiAggregationJob(
    IServiceScopeFactory scopeFactory,
    ILogger<StaffKpiAggregationJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 900; // 15 phút

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("StaffKpiAggregationJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await AggregateAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "StaffKpiAggregationJob failed during execution"); }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task AggregateAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var perf = scope.ServiceProvider.GetRequiredService<IStaffPerformanceService>();

        var today     = DateOnly.FromDateTime(DateTime.UtcNow);
        var yesterday = today.AddDays(-1);

        await perf.AggregateDayAsync(yesterday, ct);
        await perf.AggregateDayAsync(today, ct);
    }
}
