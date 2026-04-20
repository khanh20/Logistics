using LG.Authentication.ApplicationServices.DTOs.Role;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Exceptions;
using LG.Authentication.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.ApplicationServices.Services;

public class RoleService(
    IRoleRepository roleRepo,
    IUserRoleRepository userRoleRepo,
    IUserRepository userRepo,
    IAuditLogRepository auditRepo,
    IUnitOfWork uow,
    ILogger<RoleService> logger
) : IRoleService
{
    public async Task<List<RoleResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var roles = await roleRepo.GetAllAsync(ct);
        return roles.Select(RoleMapper.ToResponse).ToList();
    }

    public async Task<RoleResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var role = await roleRepo.GetByIdAsync(id, ct)
                   ?? throw new NotFoundException(nameof(Role), id);
        return RoleMapper.ToResponse(role);
    }

    public async Task<RoleResponse> CreateAsync(CreateRoleRequest req, CancellationToken ct = default)
    {
        if (await roleRepo.GetByNameAsync(req.Name, ct) is not null)
            throw new ConflictException($"Role '{req.Name}' already exists.");

        var role = Role.Create(req.Name, req.Description, isSystem: false, isDefault: false, req.Scope);
        await roleRepo.AddAsync(role, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Role created: {Name}", role.Name);
        return RoleMapper.ToResponse(role);
    }

    public async Task<RoleResponse> UpdateAsync(Guid id, UpdateRoleRequest req, CancellationToken ct = default)
    {
        var role = await roleRepo.GetByIdAsync(id, ct)
                   ?? throw new NotFoundException(nameof(Role), id);

        // Check name conflict with another role
        var existing = await roleRepo.GetByNameAsync(req.Name, ct);
        if (existing is not null && existing.Id != id)
            throw new ConflictException($"Role name '{req.Name}' is taken.");

        role.Update(req.Name, req.Description, req.Scope);
        await roleRepo.UpdateAsync(role, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Role updated: {Id}", id);
        return RoleMapper.ToResponse(role);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var role = await roleRepo.GetByIdAsync(id, ct)
                   ?? throw new NotFoundException(nameof(Role), id);

        if (role.IsSystem)
            throw new ForbiddenException("System roles cannot be deleted.");

        await roleRepo.DeleteAsync(role, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Role deleted: {Id}", id);
    }

    public async Task AssignRoleAsync(AssignRoleRequest req, Guid adminId, CancellationToken ct = default)
    {
        // Validate trước transaction
        var user = await userRepo.GetByIdAsync(req.UserId, ct)
                   ?? throw new NotFoundException(nameof(User), req.UserId);
        var role = await roleRepo.GetByIdAsync(req.RoleId, ct)
                   ?? throw new NotFoundException(nameof(Role), req.RoleId);

        if (await userRoleRepo.ExistsAsync(req.UserId, req.RoleId, ct))
            return;  // idempotent

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await userRoleRepo.AddAsync(UserRole.Create(req.UserId, req.RoleId, adminId), innerCt);

            var log = AuditLog.Create(adminId, "ASSIGN_ROLE", "user_roles", req.UserId,
                null,
                System.Text.Json.JsonSerializer.Serialize(new { req.RoleId, role.Name }),
                null, null);
            await auditRepo.AddAsync(log, innerCt);
        }, ct);

        logger.LogInformation("Role {Role} assigned to user {User} by {Admin}", role.Name, req.UserId, adminId);
    }

    public async Task RemoveRoleAsync(RemoveRoleRequest req, Guid adminId, CancellationToken ct = default)
    {
        var userRoles = await userRoleRepo.GetByUserIdAsync(req.UserId, ct);
        var target = userRoles.FirstOrDefault(ur => ur.RoleId == req.RoleId);
        if (target is null) return;  // idempotent

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await userRoleRepo.RemoveAsync(target, innerCt);

            var log = AuditLog.Create(adminId, "REMOVE_ROLE", "user_roles", req.UserId,
                System.Text.Json.JsonSerializer.Serialize(new { req.RoleId }),
                null, null, null);
            await auditRepo.AddAsync(log, innerCt);
        }, ct);

        logger.LogInformation("Role removed from user {User} by {Admin}", req.UserId, adminId);
    }

    public async Task<List<RoleSlimResponse>> GetByUserAsync(Guid userId, CancellationToken ct = default)
    {
        var userRoles = await userRoleRepo.GetByUserIdAsync(userId, ct);
        return userRoles.Select(ur => RoleMapper.ToSlim(ur.Role)).ToList();
    }
}

// ─────────────────────────────────────────────────────────────────────────────

public class PermissionService(
    IPermissionRepository permRepo,
    IRolePermissionRepository rpRepo,
    IRoleRepository roleRepo,
    IUserRepository userRepo,
    IUnitOfWork uow,
    ILogger<PermissionService> logger
) : IPermissionService
{
    public async Task<List<PermissionResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var perms = await permRepo.GetAllAsync(ct);
        return perms.Select(PermissionMapper.ToResponse).ToList();
    }

    public async Task<List<PermissionResponse>> GetByRoleAsync(Guid roleId, CancellationToken ct = default)
    {
        var perms = await permRepo.GetByRoleIdAsync(roleId, ct);
        return perms.Select(PermissionMapper.ToResponse).ToList();
    }

    public async Task<List<PermissionResponse>> GetByUserAsync(Guid userId, CancellationToken ct = default)
    {
        var codes = await userRepo.GetPermissionCodesAsync(userId, ct);
        var all = await permRepo.GetAllAsync(ct);
        return all.Where(p => codes.Contains(p.Code)).Select(PermissionMapper.ToResponse).ToList();
    }

    public async Task SyncRolePermissionsAsync(SyncRolePermissionsRequest req, CancellationToken ct = default)
    {
        var role = await roleRepo.GetByIdAsync(req.RoleId, ct)
                   ?? throw new NotFoundException(nameof(Role), req.RoleId);

        if (role.IsSystem)
            throw new ForbiddenException("Cannot modify permissions of a system role.");

        // Validate tất cả codes trước khi mở transaction
        var allPerms = await permRepo.GetAllAsync(ct);
        var permDict = allPerms.ToDictionary(p => p.Code);
        var requested = new HashSet<Guid>();

        foreach (var code in req.PermissionCodes)
        {
            if (!permDict.TryGetValue(code, out var perm))
                throw new NotFoundException(nameof(Permission), code);
            requested.Add(perm.Id);
        }

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var current = (await rpRepo.GetByRoleIdAsync(req.RoleId, innerCt))
                          .ToDictionary(rp => rp.PermissionId);

            var toRemove = current.Values
                .Where(rp => !requested.Contains(rp.PermissionId))
                .ToList();

            var toAdd = requested
                .Where(pid => !current.ContainsKey(pid))
                .Select(pid => RolePermission.Create(req.RoleId, pid))
                .ToList();

            if (toRemove.Count > 0)
                await rpRepo.RemoveRangeAsync(toRemove, innerCt);

            if (toAdd.Count > 0)
                await rpRepo.AddRangeAsync(toAdd, innerCt);

            logger.LogInformation("Permissions synced for role {RoleId}: +{Add} -{Remove}",
                req.RoleId, toAdd.Count, toRemove.Count);
        }, ct);
    }
}