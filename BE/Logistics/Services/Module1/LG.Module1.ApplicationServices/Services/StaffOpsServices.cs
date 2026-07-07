using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Repositories;

namespace LG.Module1.ApplicationServices.Services;

// ── StaffNotifier — port impl ghi vào StaffNotification (DB) ──────────────────
public class StaffNotifier(
    IStaffNotificationRepository repo,
    IModule1UnitOfWork           uow
) : IStaffNotifier
{
    public async Task NotifyAsync(Guid staffId, StaffNotificationType type, string title, string body,
                                  Guid? refOrderId = null, CancellationToken ct = default)
    {
        var n = StaffNotification.Create(staffId, type, title, body, refOrderId);
        await repo.AddAsync(n, ct);
        await uow.SaveChangesAsync(ct);
    }
}

// ── StaffNotificationService — read side cho portal ──────────────────────────
public class StaffNotificationService(
    IStaffNotificationRepository repo,
    IModule1UnitOfWork           uow
) : IStaffNotificationService
{
    public async Task<List<StaffNotificationDto>> GetMineAsync(Guid staffId, bool unreadOnly, CancellationToken ct = default)
    {
        var list = await repo.GetByStaffAsync(staffId, unreadOnly, take: 50, ct);
        return list.Select(n => new StaffNotificationDto(
            n.Id, n.Type.ToString(), n.Title, n.Body, n.RefOrderId, n.IsRead, n.CreatedAt)).ToList();
    }

    public Task<int> CountUnreadAsync(Guid staffId, CancellationToken ct = default) =>
        repo.CountUnreadAsync(staffId, ct);

    public async Task MarkReadAsync(Guid staffId, Guid notificationId, CancellationToken ct = default)
    {
        var n = await repo.GetByIdAsync(notificationId, ct);
        if (n is null || n.StaffId != staffId) return;
        n.MarkRead();
        await repo.UpdateAsync(n, ct);
        await uow.SaveChangesAsync(ct);
    }

    public Task MarkAllReadAsync(Guid staffId, CancellationToken ct = default) =>
        repo.MarkAllReadAsync(staffId, ct);
}

// ── StaffWorkSettingService — ca làm + năng lực ──────────────────────────────
public class StaffWorkSettingService(
    IStaffWorkSettingRepository repo,
    IStaffAssignmentRepository  assignmentRepo,
    IStaffDirectoryService      directory,
    IModule1UnitOfWork          uow
) : IStaffWorkSettingService
{
    public async Task<StaffWorkSettingDto> GetOrCreateAsync(Guid staffId, CancellationToken ct = default)
    {
        var setting = await GetOrCreateEntityAsync(staffId, ct);
        var load    = await assignmentRepo.GetActiveLoadAsync(staffId, ct);
        return MapToDto(setting, load, null);
    }

    public async Task<StaffWorkSettingDto> UpdateAsync(Guid staffId, UpdateWorkSettingRequest req, CancellationToken ct = default)
    {
        var setting = await GetOrCreateEntityAsync(staffId, ct);
        setting.UpdateSettings(req.IsAvailable, req.AutoAssignEnabled, req.MaxConcurrentOrders,
                               ParseTime(req.ShiftStartLocal), ParseTime(req.ShiftEndLocal));
        await repo.UpdateAsync(setting, ct);
        await uow.SaveChangesAsync(ct);
        var load = await assignmentRepo.GetActiveLoadAsync(staffId, ct);
        return MapToDto(setting, load, null);
    }

    public async Task<StaffWorkSettingDto> SetAvailabilityAsync(Guid staffId, bool isAvailable, CancellationToken ct = default)
    {
        var setting = await GetOrCreateEntityAsync(staffId, ct);
        if (isAvailable) setting.GoOnline(); else setting.GoOffline();
        await repo.UpdateAsync(setting, ct);
        await uow.SaveChangesAsync(ct);
        var load = await assignmentRepo.GetActiveLoadAsync(staffId, ct);
        return MapToDto(setting, load, null);
    }

    public Task<StaffWorkSettingDto> AdminUpdateAsync(Guid staffId, UpdateWorkSettingRequest req, CancellationToken ct = default) =>
        UpdateAsync(staffId, req, ct);

    public async Task<List<StaffWorkSettingDto>> GetAllForAdminAsync(CancellationToken ct = default)
    {
        var settings = await repo.GetAllAsync(ct);
        var names    = await SafeResolveAsync(settings.Select(s => s.StaffId), ct);
        var result   = new List<StaffWorkSettingDto>();
        foreach (var s in settings)
        {
            var load = await assignmentRepo.GetActiveLoadAsync(s.StaffId, ct);
            result.Add(MapToDto(s, load, names.GetValueOrDefault(s.StaffId)));
        }
        return result;
    }

    private async Task<StaffWorkSetting> GetOrCreateEntityAsync(Guid staffId, CancellationToken ct)
    {
        var setting = await repo.GetByStaffIdAsync(staffId, ct);
        if (setting is not null) return setting;
        setting = StaffWorkSetting.CreateDefault(staffId);
        await repo.AddAsync(setting, ct);
        await uow.SaveChangesAsync(ct);
        return setting;
    }

    private async Task<IReadOnlyDictionary<Guid, StaffDirectoryEntry>> SafeResolveAsync(
        IEnumerable<Guid> ids, CancellationToken ct)
    {
        try { return await directory.ResolveAsync(ids, ct); }
        catch { return new Dictionary<Guid, StaffDirectoryEntry>(); }
    }

    private static StaffWorkSettingDto MapToDto(StaffWorkSetting s, int activeLoad, StaffDirectoryEntry? entry) => new(
        StaffId:             s.StaffId,
        StaffName:           entry?.FullName,
        StaffEmail:          entry?.Email,
        IsAvailable:         s.IsAvailable,
        AutoAssignEnabled:   s.AutoAssignEnabled,
        MaxConcurrentOrders: s.MaxConcurrentOrders,
        ShiftStartLocal:     s.ShiftStartLocal?.ToString("HH:mm"),
        ShiftEndLocal:       s.ShiftEndLocal?.ToString("HH:mm"),
        LastActiveAt:        s.LastActiveAt,
        ActiveLoad:          activeLoad
    );

    private static TimeOnly? ParseTime(string? hhmm) =>
        TimeOnly.TryParse(hhmm, out var t) ? t : null;
}

// ── StaffPerformanceService — KPI aggregate + query ──────────────────────────
public class StaffPerformanceService(
    IStaffPerformanceRepository perfRepo,
    IStaffAssignmentRepository  assignmentRepo,
    IStaffDirectoryService      directory,
    IModule1UnitOfWork          uow
) : IStaffPerformanceService
{
    public async Task<StaffKpiDto> GetStaffKpiAsync(Guid staffId, DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows  = await perfRepo.GetRangeAsync(staffId, from, to, ct);
        var entry = (await SafeResolveAsync([staffId], ct)).GetValueOrDefault(staffId);
        return BuildKpi(staffId, entry?.FullName, from, to, rows);
    }

    public async Task<List<StaffKpiDto>> GetTeamKpiAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        var rows  = await perfRepo.GetRangeAsync(null, from, to, ct);
        var byStaff = rows.GroupBy(r => r.StaffId).ToList();
        var names = await SafeResolveAsync(byStaff.Select(g => g.Key), ct);
        return byStaff
            .Select(g => BuildKpi(g.Key, names.GetValueOrDefault(g.Key)?.FullName, from, to, g.ToList()))
            .OrderByDescending(k => k.OrdersCompleted)
            .ToList();
    }

    public async Task AggregateDayAsync(DateOnly date, CancellationToken ct = default)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var dayEnd   = dayStart.AddDays(1);

        var assignments = await assignmentRepo.GetAssignedBetweenAsync(dayStart, dayEnd, ct);
        var byStaff = assignments.GroupBy(a => a.StaffId);

        foreach (var g in byStaff)
        {
            var assigned  = g.Count();
            var completed = g.Where(a => a.Status == AssignmentStatus.Done).ToList();
            var onTime    = completed.Count(a => a.IsOnTime == true);
            var overdue   = g.Count(a => a.IsOverdue);
            var cancelled = g.Count(a => a.Status == AssignmentStatus.Cancelled);
            var totalMin  = completed.Sum(a => a.HandlingMinutes ?? 0);

            var snapshot = await perfRepo.GetAsync(g.Key, date, ct);
            if (snapshot is null)
            {
                snapshot = StaffPerformanceDaily.Create(g.Key, date);
                snapshot.SetCounters(assigned, completed.Count, onTime, overdue, cancelled, totalMin);
                await perfRepo.AddAsync(snapshot, ct);
            }
            else
            {
                snapshot.SetCounters(assigned, completed.Count, onTime, overdue, cancelled, totalMin);
                await perfRepo.UpdateAsync(snapshot, ct);
            }
        }

        await uow.SaveChangesAsync(ct);
    }

    private static StaffKpiDto BuildKpi(Guid staffId, string? name, DateOnly from, DateOnly to,
                                        List<StaffPerformanceDaily> rows)
    {
        var assigned  = rows.Sum(r => r.OrdersAssigned);
        var completed = rows.Sum(r => r.OrdersCompleted);
        var onTime    = rows.Sum(r => r.OnTimeCount);
        var overdue   = rows.Sum(r => r.OverdueCount);
        var cancelled = rows.Sum(r => r.CancelledCount);
        var totalMin  = rows.Sum(r => r.TotalHandlingMinutes);

        var series = rows.Select(r => new StaffKpiPointDto(
            r.Date, r.OrdersAssigned, r.OrdersCompleted, r.OnTimeCount,
            r.OverdueCount, r.CancelledCount, r.AvgHandlingMinutes)).ToList();

        return new StaffKpiDto(
            StaffId:            staffId,
            StaffName:          name,
            From:               from,
            To:                 to,
            OrdersAssigned:     assigned,
            OrdersCompleted:    completed,
            OnTimeCount:        onTime,
            OverdueCount:       overdue,
            CancelledCount:     cancelled,
            AvgHandlingMinutes: completed > 0 ? totalMin / completed : 0,
            OnTimeRate:         completed > 0 ? Math.Round((decimal)onTime / completed, 4) : 0m,
            Series:             series
        );
    }

    private async Task<IReadOnlyDictionary<Guid, StaffDirectoryEntry>> SafeResolveAsync(
        IEnumerable<Guid> ids, CancellationToken ct)
    {
        try { return await directory.ResolveAsync(ids, ct); }
        catch { return new Dictionary<Guid, StaffDirectoryEntry>(); }
    }
}
