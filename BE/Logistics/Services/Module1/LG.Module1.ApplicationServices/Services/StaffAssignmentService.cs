using System.Net.Http.Json;
using LG.Module1.ApplicationServices.DTOs.Order;
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
    private const string CacheKey = "staff-roster:NvMuaHang";
    private const string RoleName = "NvMuaHang";
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
    IModule1UnitOfWork          uow,
    ILogger<StaffAssignmentService> logger
) : IStaffAssignmentService
{
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

            // Lấy workload của từng staff
            var loads = new List<(Guid StaffId, int ActiveLoad, int OverdueCount)>();
            foreach (var staffId in availableStaffIds)
            {
                var active  = await assignmentRepo.GetActiveLoadAsync(staffId, innerCt);
                var overdue = await assignmentRepo.GetOverdueCountAsync(staffId, innerCt);
                loads.Add((staffId, active, overdue));
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
            // Soft-complete assignment cũ (tránh Bug 2: không hard-delete)
            var current = await assignmentRepo.GetActiveByOrderIdAsync(orderId, innerCt);
            if (current is not null)
            {
                current.MarkCompleted();
                await assignmentRepo.UpdateAsync(current, innerCt);
            }

            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);

            // Cập nhật AssignedStaffId trên đơn hàng
            order.AssignToStaff(newStaffId, ShopIntegrationMode.Manual);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);

            return await CreateAssignmentInternalAsync(order, newStaffId, adminId,
                note ?? "Reassign bởi admin", innerCt);
        }, ct);
    }

    // ── Hoàn thành assignment ─────────────────────────────────────────────────

    public async Task MarkCompletedAsync(Guid assignmentId, CancellationToken ct = default)
    {
        // GetActiveByOrderIdAsync dùng OrderId; MarkCompleted thường gọi với orderId
        var assignment = await assignmentRepo.GetActiveByOrderIdAsync(assignmentId, ct)
                         ?? throw new OrderNotFoundException(assignmentId);
        assignment.MarkCompleted();
        await assignmentRepo.UpdateAsync(assignment, ct);
        await uow.SaveChangesAsync(ct);
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    public async Task<List<OverdueAssignmentDto>> GetOverdueAsync(CancellationToken ct = default)
    {
        var list = await assignmentRepo.GetOverdueAsync(ct);
        return list.Select(MapToOverdue).ToList();
    }

    public async Task<StaffWorkloadDto> GetWorkloadAsync(Guid staffId, CancellationToken ct = default)
    {
        var assignments = await assignmentRepo.GetByStaffIdAsync(staffId, activeOnly: true, ct);
        var overdue     = assignments.Count(a => a.IsOverdue);
        return new StaffWorkloadDto(
            StaffId:     staffId,
            ActiveCount: assignments.Count,
            OverdueCount: overdue,
            Assignments: assignments.Select(MapToDto).ToList()
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
        var slaWindow  = SlaCalculator.Calculate(order.FinalAmountVnd, order.Items.Count);
        var deadline   = DateTime.UtcNow.Add(slaWindow);

        var assignment = StaffAssignment.Create(order.Id, staffId, deadline, assignedByAdminId, note);

        // Dùng AddAsync riêng — tránh Bug 1 (EF snapshot child entity)
        await assignmentRepo.AddAsync(assignment, ct);

        logger.LogInformation(
            "StaffAssignment created: order={OrderCode}, staff={StaffId}, sla={SlaDeadline:u}",
            order.OrderCode, staffId, deadline);

        return MapToDto(assignment);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    internal static StaffAssignmentDto MapToDto(StaffAssignment a) => new(
        Id:               a.Id,
        OrderId:          a.OrderId,
        StaffId:          a.StaffId,
        AssignedAt:       a.AssignedAt,
        SlaDeadline:      a.SlaDeadline,
        CompletedAt:      a.CompletedAt,
        IsOverdue:        a.IsOverdue,
        IsAutoAssigned:   a.AssignedByAdminId is null,
        Note:             a.Note
    );

    private static OverdueAssignmentDto MapToOverdue(StaffAssignment a) => new(
        AssignmentId:     a.Id,
        OrderId:          a.OrderId,
        OrderCode:        a.Order?.OrderCode ?? "—",
        StaffId:          a.StaffId,
        SlaDeadline:      a.SlaDeadline,
        OverdueByMinutes: (int)(DateTime.UtcNow - a.SlaDeadline).TotalMinutes,
        OrderStatus:      a.Order?.Status.ToString() ?? "—"
    );
}
