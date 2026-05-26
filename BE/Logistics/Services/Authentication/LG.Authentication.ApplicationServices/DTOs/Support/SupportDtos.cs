using System.ComponentModel.DataAnnotations;
using LG.Authentication.Domain.Entities;

namespace LG.Authentication.ApplicationServices.DTOs.Support;

// ── SystemConfig ──────────────────────────────────────────────────────────────
public record SystemConfigResponse(
    Guid    Id,
    string  Key,
    string  Value,
    string  ValueType,
    string? Description,
    DateTime UpdatedAt
);

public record UpsertConfigRequest(
    [Required, MaxLength(100)] string Key,
    [Required]                 string Value,
    [Required]                 string ValueType,   // String|Number|Boolean|Json
    [MaxLength(255)]           string? Description
);

// ── Notification ──────────────────────────────────────────────────────────────
public record NotificationResponse(
    Guid     Id,
    string   Title,
    string   Content,
    string   Type,
    string?  ReferenceType,
    Guid?    ReferenceId,
    bool     IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt
);

public record SendNotificationRequest(
    [Required]               Guid   UserId,
    [Required, MaxLength(255)] string Title,
    [Required]               string Content,
    [Required]               string Type,
    string?                  ReferenceType = null,
    Guid?                    ReferenceId   = null
);

// ── AuditLog ──────────────────────────────────────────────────────────────────
public record AuditLogResponse(
    Guid     Id,
    Guid?    UserId,
    string   Action,
    string   TableName,
    Guid     RecordId,
    string?  OldData,
    string?  NewData,
    string?  IpAddress,
    string?  UserAgent,
    DateTime CreatedAt
);

public static class SupportMapper
{
    public static SystemConfigResponse ToResponse(SystemConfig c) =>
        new(c.Id, c.Key, c.Value, c.ValueType.ToString(), c.Description, c.UpdatedAt);

    public static NotificationResponse ToResponse(Notification n) =>
        new(n.Id, n.Title, n.Content, n.Type.ToString(),
            n.ReferenceType, n.ReferenceId, n.IsRead, n.ReadAt, n.CreatedAt);

    public static AuditLogResponse ToResponse(AuditLog a) =>
        new(a.Id, a.UserId, a.Action, a.TableName, a.RecordId,
            a.OldData, a.NewData, a.IpAddress, a.UserAgent, a.CreatedAt);
}
