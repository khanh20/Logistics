using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Pgvector;

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

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        // Tổng hợp lại nhiều ngày để không sót đơn hoàn thành trễ (qua cuối tuần/SLA dài)
        for (int d = 7; d >= 0; d--)
            await perf.AggregateDayAsync(today.AddDays(-d), ct);
    }
}

// ── TrendingAggregationJob ────────────────────────────────────────────────────
/// Chạy mỗi 1 ngày. Tổng hợp sản phẩm "đang thịnh hành" từ UserActivityEvent
/// (View+Purchase trong N ngày) → ghi cache trending_products cho recommendation.
public class TrendingAggregationJob(
    IServiceScopeFactory scopeFactory,
    ILogger<TrendingAggregationJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 86400; // 1 ngày
    private const int TrendingDays    = 14;
    private const int TopN            = 200;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("TrendingAggregationJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await AggregateAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "TrendingAggregationJob failed during execution"); }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task AggregateAsync(CancellationToken ct)
    {
        using var scope    = scopeFactory.CreateScope();
        var activityRepo   = scope.ServiceProvider.GetRequiredService<IUserActivityRepository>();
        var trendingRepo   = scope.ServiceProvider.GetRequiredService<ITrendingProductRepository>();
        var uow            = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var scored = await activityRepo.GetTrendingScoredAsync(TrendingDays, TopN, ct);
        var rows   = scored
            .Select((s, i) => TrendingProduct.Create(s.ProductId, s.Score, i + 1))
            .ToList();

        await trendingRepo.ReplaceAllAsync(rows, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("TrendingAggregationJob: refreshed {Count} trending products", rows.Count);
    }
}

// ── CoViewMatrixJob ───────────────────────────────────────────────────────────
/// Chạy mỗi 6 giờ. Tính "người xem X cũng xem Y" từ UserActivityEvent (View),
/// nhóm theo phiên (CustomerId/SessionKey) → ghi cache product_co_views.
public class CoViewMatrixJob(
    IServiceScopeFactory scopeFactory,
    ILogger<CoViewMatrixJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 21600; // 6 giờ
    private const int Days            = 30;
    private const int MaxRows         = 200_000;
    private const int MaxPerSession   = 50;
    private const int TopKPerProduct  = 20;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("CoViewMatrixJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ComputeAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogError(ex, "CoViewMatrixJob failed during execution"); }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task ComputeAsync(CancellationToken ct)
    {
        using var scope  = scopeFactory.CreateScope();
        var activityRepo = scope.ServiceProvider.GetRequiredService<IUserActivityRepository>();
        var coViewRepo   = scope.ServiceProvider.GetRequiredService<IProductCoViewRepository>();
        var uow          = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var src = await activityRepo.GetCoViewSourceAsync(Days, MaxRows, ct);
        if (src.Count == 0) return;

        // Gom sản phẩm theo phiên (giới hạn để chống phiên rác).
        var sessions = new Dictionary<string, HashSet<Guid>>();
        foreach (var r in src)
        {
            var sid = r.CustomerId?.ToString() ?? r.SessionKey ?? "anon";
            if (!sessions.TryGetValue(sid, out var set)) { set = new HashSet<Guid>(); sessions[sid] = set; }
            if (set.Count < MaxPerSession) set.Add(r.ProductId);
        }

        // Đếm cặp có hướng (a → b): A và B cùng xuất hiện trong 1 phiên.
        var pairCount = new Dictionary<(Guid A, Guid B), double>();
        foreach (var set in sessions.Values)
        {
            if (set.Count < 2) continue;
            var arr = set.ToArray();
            for (int i = 0; i < arr.Length; i++)
                for (int j = 0; j < arr.Length; j++)
                {
                    if (i == j) continue;
                    var key = (arr[i], arr[j]);
                    pairCount[key] = pairCount.GetValueOrDefault(key) + 1;
                }
        }

        // Top-K related cho mỗi sản phẩm.
        var rows = pairCount
            .GroupBy(kv => kv.Key.A)
            .SelectMany(g => g.OrderByDescending(kv => kv.Value).Take(TopKPerProduct)
                .Select(kv => ProductCoView.Create(kv.Key.A, kv.Key.B, kv.Value)))
            .ToList();

        await coViewRepo.ReplaceAllAsync(rows, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("CoViewMatrixJob: {Pairs} co-view rows from {Sessions} sessions",
            rows.Count, sessions.Count);
    }
}

// ── EmbeddingBackfillJob ──────────────────────────────────────────────────────
/// Chạy mỗi 10 phút. Sinh embedding cho sản phẩm chưa có vector (Plan G).
/// Cần Embedding service (TEI/Qwen) chạy; offline → log cảnh báo, thử lại lần sau.
public class EmbeddingBackfillJob(
    IServiceScopeFactory scopeFactory,
    ILogger<EmbeddingBackfillJob> logger
) : BackgroundService
{
    private const int IntervalSeconds = 600; // 10 phút
    private const int BatchSize       = 32;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("EmbeddingBackfillJob started (interval: {Interval}s)", IntervalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await BackfillAsync(stoppingToken); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            { logger.LogWarning(ex, "EmbeddingBackfillJob skipped (embedding service offline?)"); }

            await Task.Delay(TimeSpan.FromSeconds(IntervalSeconds), stoppingToken);
        }
    }

    private async Task BackfillAsync(CancellationToken ct)
    {
        using var scope   = scopeFactory.CreateScope();
        var embeddingRepo = scope.ServiceProvider.GetRequiredService<IProductEmbeddingRepository>();
        var productRepo   = scope.ServiceProvider.GetRequiredService<IProductRepository>();
        var provider      = scope.ServiceProvider.GetRequiredService<IEmbeddingProvider>();
        var uow           = scope.ServiceProvider.GetRequiredService<IModule1UnitOfWork>();

        var ids = await embeddingRepo.GetProductIdsMissingEmbeddingAsync(BatchSize, ct);
        if (ids.Count == 0) return;

        var products = await productRepo.GetByIdsAsync(ids, ct);
        if (products.Count == 0) return;

        // Văn bản embed = title gốc (CN) + title dịch (VN) → vector đa ngữ.
        var texts   = products.Select(p => $"{p.OriginalTitle} {p.TranslatedTitle}".Trim()).ToList();
        var vectors = await provider.EmbedBatchAsync(texts, ct);
        if (vectors.Count != products.Count)
        {
            logger.LogWarning("EmbeddingBackfillJob: vector count {V} != product count {P}", vectors.Count, products.Count);
            return;
        }

        for (int i = 0; i < products.Count; i++)
        {
            if (vectors[i].Length == 0) continue;
            await embeddingRepo.UpsertAsync(products[i].Id, new Vector(vectors[i]), provider.ModelName, ct);
        }

        await uow.SaveChangesAsync(ct);
        logger.LogInformation("EmbeddingBackfillJob: embedded {Count} products", products.Count);
    }
}
