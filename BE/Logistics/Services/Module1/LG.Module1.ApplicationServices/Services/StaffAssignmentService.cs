using System.Net.Http.Json;
using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using LG.Module1.Domain.Rules;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// ── LogisticsServiceStub ──────────
public class LogisticsServiceStub : ILogisticsService
{
    public Task<string> CreateShipmentAsync(Guid customerOrderId, string trackingCode,
                                             CancellationToken ct = default)
        // Trả giá trị hợp lệ để flow không bị throw
        => Task.FromResult($"SHIP-STUB-{customerOrderId.ToString("N")[..8]}");

    public Task<ShipmentStatusDto> GetShipmentStatusAsync(Guid customerOrderId,
                                                           CancellationToken ct = default)
        => Task.FromResult(new ShipmentStatusDto(
            ShipmentCode: $"SHIP-STUB-{customerOrderId.ToString("N")[..8]}",
            Status:        "InTransit",
            Location:      "Kho TQ (stub)",
            UpdatedAt:     DateTime.UtcNow));
}

// ── StaffRosterHttpService ────────────────────────────────────────────────────
// Gọi sang Auth service qua endpoint /api/internal/staff-roster để lấy danh sách
// nhân viên có role "NvMuaHang". Bảo mật bằng header X-Internal-Key (shared secret).
//
// Có cache nhẹ trong memory (TTL 60s) để giảm tải Auth — roster ít thay đổi.
// HttpClient được DI inject với BaseAddress + DefaultRequestHeaders đã cấu hình sẵn.
public class StaffRosterHttpService(
    HttpClient                                       httpClient,
    Microsoft.Extensions.Caching.Memory.IMemoryCache cache,
    ILogger<StaffRosterHttpService>                  logger
) : IStaffRosterService
{
    private const string CacheKey = "staff-roster:NV_MuaHang";
    private const string RoleName = "NV_MuaHang";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    public async Task<IReadOnlyList<Guid>> GetAvailableStaffAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue<IReadOnlyList<Guid>>(CacheKey, out var cached) && cached is not null)
            return cached;

        try
        {
            var url = $"/api/internal/staff-roster?role={RoleName}&activeOnly=true";
            var resp = await httpClient.GetAsync(url, ct);

            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("StaffRoster fetch failed: {Status} from Auth service",
                    resp.StatusCode);
                return [];
            }

            var items = await resp.Content.ReadFromJsonAsync<List<StaffRosterItem>>(
                cancellationToken: ct);
            var ids = (items ?? [])
                      .Select(x => x.Id)
                      .ToList() as IReadOnlyList<Guid>;

            cache.Set(CacheKey, ids, CacheTtl);
            return ids;
        }
        catch (Exception ex)
        {
            // Không throw — auto-assign job sẽ skip vòng này, lần sau retry
            logger.LogError(ex, "StaffRoster HTTP call to Auth service failed");
            return [];
        }
    }

    // Internal record để parse JSON response, không expose ra ngoài.
    private record StaffRosterItem(Guid Id, string FullName, string Email);
}

// ── StaffAssignmentService ─────────────────────────────────────────────────────
public class StaffAssignmentService(
    IStaffAssignmentRepository  assignmentRepo,
    ICustomerOrderRepository    orderRepo,
    IOrderStatusHistoryRepository historyRepo,
    IStaffWorkSettingRepository workSettingRepo,
    IStaffNotifier              notifier,
    IStaffDirectoryService      directory,
    IModule1UnitOfWork          uow,
    ILogger<StaffAssignmentService> logger
) : IStaffAssignmentService
{
    private static readonly WorkingHoursConfig WorkHours = WorkingHoursConfig.Default;

    // ── Auto-assign (dùng bởi OrderAssignmentJob) ─────────────────────────────

    public async Task<StaffAssignmentDto?> AutoAssignAsync(
        Guid orderId, IReadOnlyList<Guid> availableStaffIds, CancellationToken ct = default)
    {
        if (availableStaffIds.Count == 0)
        {
            logger.LogWarning("AutoAssign order {OrderId}: no available staff", orderId);
            return null;
        }

        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);

            // Lọc NV đủ điều kiện theo work-setting: online, bật auto-assign, trong ca,
            // còn dưới hạn năng lực. NV chưa có setting → coi như mặc định (đủ điều kiện).
            var settings = (await workSettingRepo.GetByStaffIdsAsync(availableStaffIds, innerCt))
                           .ToDictionary(s => s.StaffId);
            var localNow = TimeOnly.FromDateTime(DateTime.UtcNow.AddHours(WorkHours.TimezoneOffsetHours));

            var loads = new List<(Guid StaffId, int ActiveLoad, int OverdueCount)>();
            foreach (var staffId in availableStaffIds)
            {
                var active = await assignmentRepo.GetActiveLoadAsync(staffId, innerCt);

                if (settings.TryGetValue(staffId, out var s))
                {
                    if (!s.IsAvailable || !s.AutoAssignEnabled) continue;
                    if (!s.IsWithinShift(localNow))             continue;
                    if (active >= s.MaxConcurrentOrders)        continue;
                }

                var overdue = await assignmentRepo.GetOverdueCountAsync(staffId, innerCt);
                loads.Add((staffId, active, overdue));
            }

            if (loads.Count == 0)
            {
                logger.LogInformation("AutoAssign order {OrderId}: no eligible staff (availability/capacity)", orderId);
                return null;
            }

            // WorkloadBalancer chọn staff có ít việc nhất
            var bestStaff = WorkloadBalancer.PickBest(loads);
            if (bestStaff is null) return null;

            return await CreateAssignmentInternalAsync(order, bestStaff.Value,
                assignedByAdminId: null, note: "Auto-assign bởi hệ thống", innerCt);
        }, ct);
    }

    // ── Manual assign (Admin chọn tay) ────────────────────────────────────────

    public async Task<StaffAssignmentDto> ManualAssignAsync(
        Guid orderId, Guid staffId, Guid adminId, string? note, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);

            return await CreateAssignmentInternalAsync(order, staffId, adminId, note, innerCt);
        }, ct);
    }

    // ── Reassign (Admin chuyển sang NV khác) ──────────────────────────────────

    public async Task<StaffAssignmentDto> ReassignAsync(
        Guid orderId, Guid newStaffId, Guid adminId, string? note, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            // Soft-close assignment cũ (đánh dấu Reassigned, không tính là Done).
            var current = await assignmentRepo.GetActiveByOrderIdAsync(orderId, innerCt);
            if (current is not null)
            {
                current.MarkReassigned();
                await assignmentRepo.UpdateAsync(current, innerCt);
            }

            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);

            order.Reassign(newStaffId, adminId, note ?? "Reassign bởi admin");
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);

            return await CreateAssignmentInternalAsync(order, newStaffId, adminId,
                note ?? "Reassign bởi admin", innerCt);
        }, ct);
    }

    // ── Hoàn thành assignment ─────────────────────────────────────────────────

    public async Task MarkCompletedAsync(Guid assignmentId, CancellationToken ct = default)
    {
        var assignment = await assignmentRepo.GetByIdAsync(assignmentId, ct)
                         ?? throw new OrderNotFoundException(assignmentId);
        assignment.MarkCompleted();
        await assignmentRepo.UpdateAsync(assignment, ct);
        await uow.SaveChangesAsync(ct);
    }

    // ── Portal NV — vòng đời assignment ───────────────────────────────────────

    public Task<StaffAssignmentDto> AcceptAsync(Guid assignmentId, Guid staffId, CancellationToken ct = default) =>
        TransitionMineAsync(assignmentId, staffId, a => a.Accept(), ct);

    public Task<StaffAssignmentDto> StartAsync(Guid assignmentId, Guid staffId, CancellationToken ct = default) =>
        TransitionMineAsync(assignmentId, staffId, a => a.Start(), ct);

    public Task<StaffAssignmentDto> CompleteAsync(Guid assignmentId, Guid staffId, CancellationToken ct = default) =>
        TransitionMineAsync(assignmentId, staffId, a => a.MarkCompleted(), ct);

    private async Task<StaffAssignmentDto> TransitionMineAsync(
        Guid assignmentId, Guid staffId, Action<StaffAssignment> transition, CancellationToken ct)
    {
        var assignment = await assignmentRepo.GetByIdAsync(assignmentId, ct)
                         ?? throw new OrderNotFoundException(assignmentId);
        if (assignment.StaffId != staffId)
            throw new UnauthorizedAccessException("Assignment không thuộc về nhân viên này.");

        transition(assignment);
        await assignmentRepo.UpdateAsync(assignment, ct);
        await uow.SaveChangesAsync(ct);
        return MapToDto(assignment);
    }

    public async Task<List<StaffQueueItemDto>> GetMyQueueAsync(Guid staffId, bool includeClosed, CancellationToken ct = default)
    {
        var list = await assignmentRepo.GetQueueByStaffAsync(staffId, includeClosed, ct);
        return list.Select(a => new StaffQueueItemDto(
            AssignmentId:     a.Id,
            OrderId:          a.OrderId,
            OrderCode:        a.Order?.OrderCode ?? "—",
            OrderStatus:      a.Order?.Status.ToString() ?? "—",
            OrderStatusLabel: a.Order?.Status.ToString() ?? "—",
            AssignmentStatus: a.Status.ToString(),
            FinalAmountVnd:   a.Order?.FinalAmountVnd ?? 0,
            ItemCount:        a.Order?.Items.Count ?? 0,
            AssignedAt:       a.AssignedAt,
            SlaDeadline:      a.SlaDeadline,
            AcceptedAt:       a.AcceptedAt,
            StartedAt:        a.StartedAt,
            CompletedAt:      a.CompletedAt,
            IsOverdue:        a.IsOverdue,
            HandlingMinutes:  a.HandlingMinutes
        )).ToList();
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    public async Task<List<OverdueAssignmentDto>> GetOverdueAsync(CancellationToken ct = default)
    {
        var list  = await assignmentRepo.GetOverdueAsync(ct);
        var names = await ResolveNamesAsync(list.Select(a => a.StaffId), ct);
        return list.Select(a => MapToOverdue(a, names)).ToList();
    }

    private async Task<IReadOnlyDictionary<Guid, string>> ResolveNamesAsync(
        IEnumerable<Guid> staffIds, CancellationToken ct)
    {
        try
        {
            var entries = await directory.ResolveAsync(staffIds, ct);
            return entries.ToDictionary(kv => kv.Key, kv => kv.Value.FullName);
        }
        catch
        {
            // Directory lỗi không nên làm vỡ query — trả map rỗng.
            return new Dictionary<Guid, string>();
        }
    }

    public async Task<StaffWorkloadDto> GetWorkloadAsync(Guid staffId, CancellationToken ct = default)
    {
        var assignments = await assignmentRepo.GetByStaffIdAsync(staffId, activeOnly: true, ct);
        var overdue     = assignments.Count(a => a.IsOverdue);
        return new StaffWorkloadDto(
            StaffId:     staffId,
            ActiveCount: assignments.Count,
            OverdueCount: overdue,
            Assignments: assignments.Select(a => MapToDto(a)).ToList()
        );
    }

    public async Task<StaffAssignmentDto?> GetActiveByOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var a = await assignmentRepo.GetActiveByOrderIdAsync(orderId, ct);
        return a is null ? null : MapToDto(a);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<StaffAssignmentDto> CreateAssignmentInternalAsync(
        CustomerOrder order, Guid staffId, Guid? assignedByAdminId, string? note,
        CancellationToken ct)
    {
        // SLA tính theo GIỜ LÀM VIỆC (08–18, T2–T6) thay vì giờ thực.
        var slaWindow = SlaCalculator.Calculate(order.FinalAmountVnd, order.Items.Count);
        var deadline  = SlaCalculator.CalcWorkingDeadline(DateTime.UtcNow, slaWindow, WorkHours);

        var assignment = StaffAssignment.Create(order.Id, staffId, deadline, assignedByAdminId, note);

        // Dùng AddAsync riêng — tránh Bug 1 (EF snapshot child entity)
        await assignmentRepo.AddAsync(assignment, ct);

        logger.LogInformation(
            "StaffAssignment created: order={OrderCode}, staff={StaffId}, sla={SlaDeadline:u}",
            order.OrderCode, staffId, deadline);

        // Thông báo cho NV (không để fail làm vỡ transaction chính).
        try
        {
            await notifier.NotifyAsync(staffId, StaffNotificationType.OrderAssigned,
                "Đơn mới được phân công",
                $"Bạn được phân công đơn {order.OrderCode}. Hạn xử lý: {deadline:dd/MM HH:mm} UTC.",
                order.Id, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Notify staff {StaffId} on assign failed", staffId);
        }

        return MapToDto(assignment);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    internal static StaffAssignmentDto MapToDto(StaffAssignment a, string? staffName = null) => new(
        Id:               a.Id,
        OrderId:          a.OrderId,
        StaffId:          a.StaffId,
        AssignedAt:       a.AssignedAt,
        SlaDeadline:      a.SlaDeadline,
        CompletedAt:      a.CompletedAt,
        IsOverdue:        a.IsOverdue,
        IsAutoAssigned:   a.AssignedByAdminId is null,
        Note:             a.Note,
        Status:           a.Status.ToString(),
        AcceptedAt:       a.AcceptedAt,
        StartedAt:        a.StartedAt,
        HandlingMinutes:  a.HandlingMinutes,
        IsOnTime:         a.IsOnTime,
        OrderCode:        a.Order?.OrderCode,
        StaffName:        staffName
    );

    private static OverdueAssignmentDto MapToOverdue(StaffAssignment a, IReadOnlyDictionary<Guid, string> names) => new(
        AssignmentId:     a.Id,
        OrderId:          a.OrderId,
        OrderCode:        a.Order?.OrderCode ?? "—",
        StaffId:          a.StaffId,
        SlaDeadline:      a.SlaDeadline,
        OverdueByMinutes: (int)(DateTime.UtcNow - a.SlaDeadline).TotalMinutes,
        OrderStatus:      a.Order?.Status.ToString() ?? "—",
        StaffName:        names.GetValueOrDefault(a.StaffId)
    );
}
