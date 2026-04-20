using LG.Authentication.API.Filters;
using LG.Authentication.ApplicationServices.DTOs.Support;
using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

// ── System Config ─────────────────────────────────────────────────────────────
[Route("api/configs")]
public class SystemConfigsController(ISystemConfigService configService) : BaseController
{
    [HttpGet]
    [RequirePermission(Permissions.ConfigRead)]
    [ProducesResponseType(typeof(List<SystemConfigResponse>), 200)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await configService.GetAllAsync(ct);
        return Ok(result);
    }

    [HttpGet("{key}")]
    [RequirePermission(Permissions.ConfigRead)]
    [ProducesResponseType(typeof(SystemConfigResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByKey(string key, CancellationToken ct)
    {
        var result = await configService.GetByKeyAsync(key, ct);
        return Ok(result);
    }

    [HttpPut]
    [RequirePermission(Permissions.ConfigManage)]
    [ProducesResponseType(typeof(SystemConfigResponse), 200)]
    public async Task<IActionResult> Upsert([FromBody] UpsertConfigRequest req, CancellationToken ct)
    {
        var result = await configService.UpsertAsync(req, CurrentUserId, ct);
        return Ok(result, "Config saved.");
    }
}

// ── Notifications ─────────────────────────────────────────────────────────────
[Route("api/notifications")]
public class NotificationsController(INotificationService notifService) : BaseController
{
    /// Get my notifications
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<NotificationResponse>), 200)]
    public async Task<IActionResult> GetMine(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await notifService.GetMyNotificationsAsync(
            CurrentUserId, unreadOnly, page, pageSize, ct);
        return Ok(result);
    }

    /// Count unread notifications
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(int), 200)]
    public async Task<IActionResult> CountUnread(CancellationToken ct)
    {
        var count = await notifService.CountUnreadAsync(CurrentUserId, ct);
        return Ok(count);
    }

    /// Mark a notification as read
    [HttpPatch("{id:guid}/read")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await notifService.MarkReadAsync(id, CurrentUserId, ct);
        return Ok<object?>(null, "Marked as read.");
    }

    /// Mark all notifications as read
    [HttpPost("mark-all-read")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notifService.MarkAllReadAsync(CurrentUserId, ct);
        return Ok<object?>(null, "All marked as read.");
    }

    /// Admin: send notification to a user
    [HttpPost("send")]
    [RequirePermission(Permissions.NotificationManage)]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Send([FromBody] SendNotificationRequest req, CancellationToken ct)
    {
        await notifService.SendAsync(req, ct);
        return Ok<object?>(null, "Notification sent.");
    }
}

// ── Audit Logs ────────────────────────────────────────────────────────────────
[Route("api/audit-logs")]
public class AuditLogsController(IAuditLogService auditService) : BaseController
{
    [HttpGet]
    [RequirePermission(Permissions.AuditRead)]
    [ProducesResponseType(typeof(PagedResponse<AuditLogResponse>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await auditService.GetAllAsync(page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("user/{userId:guid}")]
    [RequirePermission(Permissions.AuditRead)]
    [ProducesResponseType(typeof(PagedResponse<AuditLogResponse>), 200)]
    public async Task<IActionResult> GetByUser(
        Guid userId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await auditService.GetByUserAsync(userId, page, pageSize, ct);
        return Ok(result);
    }
}
