using System.ComponentModel.DataAnnotations;
using LG.Authentication.Domain.Entities;

namespace LG.Authentication.ApplicationServices.DTOs.Role;

// ── Role Request ──────────────────────────────────────────────────────────────
public record CreateRoleRequest(
    [Required, MaxLength(50)] string  Name,
    [MaxLength(255)]          string? Description,
    [Required]                string  Scope   // "user" | "staff"
);

public record UpdateRoleRequest(
    [Required, MaxLength(50)] string  Name,
    [MaxLength(255)]          string? Description,
    [Required]                string  Scope
);

public record AssignRoleRequest(
    [Required] Guid   UserId,
    [Required] Guid   RoleId
);

public record RemoveRoleRequest(
    [Required] Guid UserId,
    [Required] Guid RoleId
);

// ── Role Response ─────────────────────────────────────────────────────────────
public record RoleResponse(
    Guid         Id,
    string       Name,
    string?      Description,
    bool         IsSystem,
    bool         IsDefault,
    string       Scope,
    DateTime     CreatedAt,
    List<string> Permissions
);

public record RoleSlimResponse(Guid Id, string Name, string Scope);

public static class RoleMapper
{
    public static RoleResponse ToResponse(Domain.Entities.Role r) => new(
        r.Id, r.Name, r.Description, r.IsSystem, r.IsDefault, r.Scope, r.CreatedAt,
        r.RolePermissions.Select(rp => rp.Permission.Code).ToList());

    public static RoleSlimResponse ToSlim(Domain.Entities.Role r) =>
        new(r.Id, r.Name, r.Scope);
}

// ── Permission DTOs ───────────────────────────────────────────────────────────
public record PermissionResponse(
    Guid    Id,
    string  Name,
    string  Code,
    string  ModuleName,
    string? Description
);

public record SyncRolePermissionsRequest(
    [Required] Guid         RoleId,
    [Required] List<string> PermissionCodes
);

public static class PermissionMapper
{
    public static PermissionResponse ToResponse(Permission p) =>
        new(p.Id, p.Name, p.Code, p.ModuleName, p.Description);
}
