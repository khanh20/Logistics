using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

// ── Portal Nhân viên — mọi endpoint scope theo CurrentUserId ─────────────────
/// Cổng thao tác của chính nhân viên (NV_MuaHang). Quyền order.manage.
[Route("api/staff")]
[Authorize(Policy = Permissions.OrderManage)]
public class StaffSelfController(
    IStaffAssignmentService    assignmentService,
    IStaffWorkSettingService   workSettingService,
    IStaffPerformanceService   performanceService,
    IStaffNotificationService  notificationService,
    ISupplierChatLogService    chatLogService
) : Module1BaseController
{
    // ── Hàng đợi assignment của tôi ──────────────────────────────────────────
    [HttpGet("assignments")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffQueueItemDto>>), 200)]
    public async Task<IActionResult> GetMyQueue([FromQuery] bool includeClosed = false, CancellationToken ct = default)
    {
        var result = await assignmentService.GetMyQueueAsync(CurrentUserId, includeClosed, ct);
        return Ok(ApiResponse<List<StaffQueueItemDto>>.Ok(result));
    }

    [HttpPost("assignments/{id:guid}/accept")]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    public async Task<IActionResult> Accept(Guid id, CancellationToken ct)
    {
        var result = await assignmentService.AcceptAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result, "Đã nhận đơn."));
    }

    [HttpPost("assignments/{id:guid}/start")]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    public async Task<IActionResult> Start(Guid id, CancellationToken ct)
    {
        var result = await assignmentService.StartAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result, "Đã bắt đầu xử lý."));
    }

    [HttpPost("assignments/{id:guid}/complete")]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var result = await assignmentService.CompleteAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result, "Đã hoàn thành."));
    }

    // ── Cấu hình ca làm + năng lực ───────────────────────────────────────────
    [HttpGet("work-setting/mine")]
    [ProducesResponseType(typeof(ApiResponse<StaffWorkSettingDto>), 200)]
    public async Task<IActionResult> GetMyWorkSetting(CancellationToken ct)
    {
        var result = await workSettingService.GetOrCreateAsync(CurrentUserId, ct);
        return Ok(ApiResponse<StaffWorkSettingDto>.Ok(result));
    }

    [HttpPut("work-setting/mine")]
    [ProducesResponseType(typeof(ApiResponse<StaffWorkSettingDto>), 200)]
    public async Task<IActionResult> UpdateMyWorkSetting([FromBody] UpdateWorkSettingRequest req, CancellationToken ct)
    {
        var result = await workSettingService.UpdateAsync(CurrentUserId, req, ct);
        return Ok(ApiResponse<StaffWorkSettingDto>.Ok(result, "Đã cập nhật."));
    }

    [HttpPost("work-setting/availability")]
    [ProducesResponseType(typeof(ApiResponse<StaffWorkSettingDto>), 200)]
    public async Task<IActionResult> SetAvailability([FromQuery] bool online, CancellationToken ct)
    {
        var result = await workSettingService.SetAvailabilityAsync(CurrentUserId, online, ct);
        return Ok(ApiResponse<StaffWorkSettingDto>.Ok(result, online ? "Đang nhận đơn." : "Đã tạm dừng nhận đơn."));
    }

    // ── KPI của tôi ──────────────────────────────────────────────────────────
    [HttpGet("kpi/mine")]
    [ProducesResponseType(typeof(ApiResponse<StaffKpiDto>), 200)]
    public async Task<IActionResult> GetMyKpi([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var (f, t) = ResolveRange(from, to);
        var result = await performanceService.GetStaffKpiAsync(CurrentUserId, f, t, ct);
        return Ok(ApiResponse<StaffKpiDto>.Ok(result));
    }

    // ── Thông báo ────────────────────────────────────────────────────────────
    [HttpGet("notifications")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffNotificationDto>>), 200)]
    public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false, CancellationToken ct = default)
    {
        var result = await notificationService.GetMineAsync(CurrentUserId, unreadOnly, ct);
        return Ok(ApiResponse<List<StaffNotificationDto>>.Ok(result));
    }

    [HttpGet("notifications/unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), 200)]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        var count = await notificationService.CountUnreadAsync(CurrentUserId, ct);
        return Ok(ApiResponse<int>.Ok(count));
    }

    [HttpPost("notifications/{id:guid}/read")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await notificationService.MarkReadAsync(CurrentUserId, id, ct);
        return Ok(ApiResponse<object>.Ok(null!, "Đã đọc."));
    }

    [HttpPost("notifications/read-all")]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notificationService.MarkAllReadAsync(CurrentUserId, ct);
        return Ok(ApiResponse<object>.Ok(null!, "Đã đọc tất cả."));
    }

    // ── Nhật ký chat NCC theo đơn ────────────────────────────────────────────
    [HttpGet("orders/{orderId:guid}/supplier-chat")]
    [ProducesResponseType(typeof(ApiResponse<List<SupplierChatLogDto>>), 200)]
    public async Task<IActionResult> GetSupplierChat(Guid orderId, CancellationToken ct)
    {
        var result = await chatLogService.GetByOrderAsync(orderId, ct);
        return Ok(ApiResponse<List<SupplierChatLogDto>>.Ok(result));
    }

    [HttpPost("orders/{orderId:guid}/supplier-chat")]
    [ProducesResponseType(typeof(ApiResponse<SupplierChatLogDto>), 201)]
    public async Task<IActionResult> AddSupplierChat(Guid orderId, [FromBody] AddSupplierChatRequest req, CancellationToken ct)
    {
        var result = await chatLogService.AddAsync(orderId, CurrentUserId, req, ct);
        return StatusCode(201, ApiResponse<SupplierChatLogDto>.Ok(result, "Đã ghi nhật ký."));
    }

    private static (DateOnly From, DateOnly To) ResolveRange(DateOnly? from, DateOnly? to)
    {
        var t = to   ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var f = from ?? t.AddDays(-29);
        return (f, t);
    }
}

// ── Admin — giám sát KPI đội + cấu hình ca/năng lực NV ───────────────────────
/// Giám sát vận hành NV cho Admin. Quyền staff.manage.
[Route("api/manage")]
[Authorize(Policy = Permissions.StaffManage)]
public class StaffOpsAdminController(
    IStaffPerformanceService performanceService,
    IStaffWorkSettingService workSettingService
) : Module1BaseController
{
    [HttpGet("staff-kpi")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffKpiDto>>), 200)]
    public async Task<IActionResult> GetTeamKpi([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var t = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var f = from ?? t.AddDays(-29);
        var result = await performanceService.GetTeamKpiAsync(f, t, ct);
        return Ok(ApiResponse<List<StaffKpiDto>>.Ok(result));
    }

    [HttpGet("staff-kpi/{staffId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<StaffKpiDto>), 200)]
    public async Task<IActionResult> GetStaffKpi(Guid staffId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var t = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var f = from ?? t.AddDays(-29);
        var result = await performanceService.GetStaffKpiAsync(staffId, f, t, ct);
        return Ok(ApiResponse<StaffKpiDto>.Ok(result));
    }

    [HttpGet("staff-settings")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffWorkSettingDto>>), 200)]
    public async Task<IActionResult> GetAllSettings(CancellationToken ct)
    {
        var result = await workSettingService.GetAllForAdminAsync(ct);
        return Ok(ApiResponse<List<StaffWorkSettingDto>>.Ok(result));
    }

    [HttpPut("staff-settings/{staffId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<StaffWorkSettingDto>), 200)]
    public async Task<IActionResult> UpdateSetting(Guid staffId, [FromBody] UpdateWorkSettingRequest req, CancellationToken ct)
    {
        var result = await workSettingService.AdminUpdateAsync(staffId, req, ct);
        return Ok(ApiResponse<StaffWorkSettingDto>.Ok(result, "Đã cập nhật."));
    }
}
