using LG.Authentication.ApplicationServices.DTOs.Support;
using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Exceptions;
using LG.Authentication.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.ApplicationServices.Services;

public class SystemConfigService(
    ISystemConfigRepository configRepo,
    IUnitOfWork             uow,
    ILogger<SystemConfigService> logger
) : ISystemConfigService
{
    public async Task<List<SystemConfigResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await configRepo.GetAllAsync(ct);
        return list.Select(SupportMapper.ToResponse).ToList();
    }

    public async Task<SystemConfigResponse> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        var config = await configRepo.GetByKeyAsync(key, ct)
                     ?? throw new NotFoundException(nameof(SystemConfig), key);
        return SupportMapper.ToResponse(config);
    }

    public async Task<SystemConfigResponse> UpsertAsync(UpsertConfigRequest req, Guid adminId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<Domain.Entities.ValueType>(req.ValueType, ignoreCase: true, out var vType))
            throw new ValidationException($"Invalid value type: {req.ValueType}");

        var existing = await configRepo.GetByKeyAsync(req.Key, ct);
        if (existing is null)
        {
            var config = SystemConfig.Create(req.Key, req.Value, vType, req.Description);
            await configRepo.AddAsync(config, ct);
            await uow.SaveChangesAsync(ct);

            logger.LogInformation("Config created: {Key} by {Admin}", req.Key, adminId);
            return SupportMapper.ToResponse(config);
        }

        existing.Update(req.Value, adminId);
        await configRepo.UpdateAsync(existing, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Config updated: {Key} by {Admin}", req.Key, adminId);
        return SupportMapper.ToResponse(existing);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

public class NotificationService(
    INotificationRepository notifRepo,
    IUnitOfWork             uow,
    ILogger<NotificationService> logger
) : INotificationService
{
    public async Task<PagedResponse<NotificationResponse>> GetMyNotificationsAsync(
        Guid userId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default)
    {
        var list  = await notifRepo.GetByUserAsync(userId, unreadOnly, page, pageSize, ct);
        var total = await notifRepo.CountUnreadAsync(userId, ct);
        var items = list.Select(SupportMapper.ToResponse).ToList();

        return new PagedResponse<NotificationResponse>(
            items, page, pageSize, total,
            (int)Math.Ceiling(total / (double)pageSize));
    }

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken ct = default) =>
        notifRepo.CountUnreadAsync(userId, ct);

    public async Task SendAsync(SendNotificationRequest req, CancellationToken ct = default)
    {
        if (!Enum.TryParse<NotificationType>(req.Type, ignoreCase: true, out var nType))
            throw new ValidationException($"Invalid notification type: {req.Type}");

        var notif = Notification.Create(req.UserId, req.Title, req.Content, nType,
                                         req.ReferenceType, req.ReferenceId);
        await notifRepo.AddAsync(notif, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Notification sent to user {UserId}: {Title}", req.UserId, req.Title);
    }

    public async Task MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default)
    {
        var list = await notifRepo.GetByUserAsync(userId, false, 1, int.MaxValue, ct);
        var notif = list.FirstOrDefault(n => n.Id == notificationId)
                    ?? throw new NotFoundException(nameof(Notification), notificationId);

        if (notif.UserId != userId) throw new ForbiddenException();

        notif.MarkRead();
        await notifRepo.UpdateAsync(notif, ct);
        await uow.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await notifRepo.MarkAllReadAsync(userId, ct);
        await uow.SaveChangesAsync(ct);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

public class AuditLogService(
    IAuditLogRepository      auditRepo,
    IUnitOfWork              uow
) : IAuditLogService
{
    public async Task<PagedResponse<AuditLogResponse>> GetAllAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var list  = await auditRepo.GetAllAsync(page, pageSize, ct);
        var items = list.Select(SupportMapper.ToResponse).ToList();
        // Note: for proper total count a CountAsync would be needed; simplified here
        return new PagedResponse<AuditLogResponse>(items, page, pageSize, items.Count, 1);
    }

    public async Task<PagedResponse<AuditLogResponse>> GetByUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var list  = await auditRepo.GetByUserAsync(userId, page, pageSize, ct);
        var items = list.Select(SupportMapper.ToResponse).ToList();
        return new PagedResponse<AuditLogResponse>(items, page, pageSize, items.Count, 1);
    }

    public async Task LogAsync(Guid? userId, string action, string tableName, Guid recordId,
                               string? oldData, string? newData, string? ip, string? userAgent,
                               CancellationToken ct = default)
    {
        var log = AuditLog.Create(userId, action, tableName, recordId, oldData, newData, ip, userAgent);
        await auditRepo.AddAsync(log, ct);
        await uow.SaveChangesAsync(ct);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

public class CurrentUserService(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor)
    : ICurrentUserService
{
    private System.Security.Claims.ClaimsPrincipal? Principal =>
        httpContextAccessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(Principal?.FindFirst("userId")?.Value, out var id) ? id : null;

    public string? Email    => Principal?.FindFirst("email")?.Value;
    public string? FullName => Principal?.FindFirst("fullName")?.Value;

    public List<string> Roles =>
        Principal?.Claims
            .Where(c => c.Type == System.Security.Claims.ClaimTypes.Role)
            .Select(c => c.Value)
            .ToList() ?? [];

    public List<string> Permissions =>
        Principal?.Claims
            .Where(c => c.Type == "permission")
            .Select(c => c.Value)
            .ToList() ?? [];

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public bool HasPermission(string permission) => Permissions.Contains(permission);
    public bool HasRole(string role)             => Roles.Contains(role);
}
