using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Repositories;
using LG.Authentication.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LG.Authentication.Infrastructure.Repositories;

// ── User ─────────────────────────────────────────────────────────────────────
public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken ct = default) =>
        db.Users.AnyAsync(u => u.Email == email.ToLowerInvariant(), ct);

    public Task<List<User>> GetAllAsync(int page, int pageSize, CancellationToken ct = default) =>
        db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync(ct);

    public Task<int> CountAsync(CancellationToken ct = default) =>
        db.Users.CountAsync(ct);

    public async Task AddAsync(User user, CancellationToken ct = default) =>
        await db.Users.AddAsync(user, ct);

    public Task UpdateAsync(User user, CancellationToken ct = default)
    {
        db.Users.Update(user);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(User user, CancellationToken ct = default)
    {
        db.Users.Remove(user);
        return Task.CompletedTask;
    }

    public async Task<List<string>> GetPermissionCodesAsync(Guid userId, CancellationToken ct = default) =>
        await (from ur in db.UserRoles
               join rp in db.RolePermissions on ur.RoleId equals rp.RoleId
               join p  in db.Permissions     on rp.PermissionId equals p.Id
               where ur.UserId == userId
               select p.Code)
              .Distinct().ToListAsync(ct);

    public async Task<List<string>> GetRoleNamesAsync(Guid userId, CancellationToken ct = default) =>
        await (from ur in db.UserRoles
               join r  in db.Roles on ur.RoleId equals r.Id
               where ur.UserId == userId
               select r.Name)
              .ToListAsync(ct);
}

// ── Role ─────────────────────────────────────────────────────────────────────
public class RoleRepository(AppDbContext db) : IRoleRepository
{
    public Task<Role?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<Role?> GetByNameAsync(string name, CancellationToken ct = default) =>
        db.Roles.FirstOrDefaultAsync(r => r.Name == name, ct);

    public Task<Role?> GetDefaultRoleAsync(CancellationToken ct = default) =>
        db.Roles.FirstOrDefaultAsync(r => r.IsDefault, ct);

    public Task<List<Role>> GetAllAsync(CancellationToken ct = default) =>
        db.Roles.Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .OrderBy(r => r.Name).ToListAsync(ct);

    public async Task AddAsync(Role role, CancellationToken ct = default) =>
        await db.Roles.AddAsync(role, ct);

    public Task UpdateAsync(Role role, CancellationToken ct = default)
    {
        db.Roles.Update(role);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Role role, CancellationToken ct = default)
    {
        db.Roles.Remove(role);
        return Task.CompletedTask;
    }
}

// ── UserRole ──────────────────────────────────────────────────────────────────
public class UserRoleRepository(AppDbContext db) : IUserRoleRepository
{
    public Task<List<UserRole>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        db.UserRoles.Include(ur => ur.Role)
                    .Where(ur => ur.UserId == userId)
                    .ToListAsync(ct);

    public Task<bool> ExistsAsync(Guid userId, Guid roleId, CancellationToken ct = default) =>
        db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == roleId, ct);

    public async Task AddAsync(UserRole userRole, CancellationToken ct = default) =>
        await db.UserRoles.AddAsync(userRole, ct);

    public Task RemoveAsync(UserRole userRole, CancellationToken ct = default)
    {
        db.UserRoles.Remove(userRole);
        return Task.CompletedTask;
    }

    public Task RemoveRangeAsync(IEnumerable<UserRole> userRoles, CancellationToken ct = default)
    {
        db.UserRoles.RemoveRange(userRoles);
        return Task.CompletedTask;
    }
}

// ── Permission ────────────────────────────────────────────────────────────────
public class PermissionRepository(AppDbContext db) : IPermissionRepository
{
    public Task<Permission?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Permissions.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Permission?> GetByCodeAsync(string code, CancellationToken ct = default) =>
        db.Permissions.FirstOrDefaultAsync(p => p.Code == code.ToLowerInvariant(), ct);

    public Task<List<Permission>> GetAllAsync(CancellationToken ct = default) =>
        db.Permissions.OrderBy(p => p.Code).ToListAsync(ct);

    public Task<List<Permission>> GetByRoleIdAsync(Guid roleId, CancellationToken ct = default) =>
        db.RolePermissions.Where(rp => rp.RoleId == roleId)
                          .Select(rp => rp.Permission)
                          .ToListAsync(ct);

    public async Task AddAsync(Permission permission, CancellationToken ct = default) =>
        await db.Permissions.AddAsync(permission, ct);

    public async Task AddRangeAsync(IEnumerable<Permission> permissions, CancellationToken ct = default) =>
        await db.Permissions.AddRangeAsync(permissions, ct);
}

// ── RolePermission ────────────────────────────────────────────────────────────
public class RolePermissionRepository(AppDbContext db) : IRolePermissionRepository
{
    public Task<List<RolePermission>> GetByRoleIdAsync(Guid roleId, CancellationToken ct = default) =>
        db.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync(ct);

    public async Task AddAsync(RolePermission rp, CancellationToken ct = default) =>
        await db.RolePermissions.AddAsync(rp, ct);

    public async Task AddRangeAsync(IEnumerable<RolePermission> rps, CancellationToken ct = default) =>
        await db.RolePermissions.AddRangeAsync(rps, ct);

    public Task RemoveAsync(RolePermission rp, CancellationToken ct = default)
    {
        db.RolePermissions.Remove(rp);
        return Task.CompletedTask;
    }

    public Task RemoveRangeAsync(IEnumerable<RolePermission> rps, CancellationToken ct = default)
    {
        db.RolePermissions.RemoveRange(rps);
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(Guid roleId, Guid permissionId, CancellationToken ct = default) =>
        db.RolePermissions.AnyAsync(rp => rp.RoleId == roleId && rp.PermissionId == permissionId, ct);
}

// ── RefreshToken ──────────────────────────────────────────────────────────────
public class RefreshTokenRepository(AppDbContext db) : IRefreshTokenRepository
{
    public Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken ct = default) =>
        db.RefreshTokens.Include(rt => rt.User)
                        .FirstOrDefaultAsync(rt => rt.Token == token, ct);

    public Task<List<RefreshToken>> GetActiveByUserAsync(Guid userId, CancellationToken ct = default) =>
        db.RefreshTokens.Where(rt => rt.UserId == userId && rt.RevokedAt == null && rt.ExpiresAt > DateTime.UtcNow)
                        .ToListAsync(ct);

    public async Task AddAsync(RefreshToken token, CancellationToken ct = default) =>
        await db.RefreshTokens.AddAsync(token, ct);

    public Task UpdateAsync(RefreshToken token, CancellationToken ct = default)
    {
        db.RefreshTokens.Update(token);
        return Task.CompletedTask;
    }

    public async Task RevokeAllForUserAsync(Guid userId, string? ip, CancellationToken ct = default)
    {
        var tokens = await GetActiveByUserAsync(userId, ct);
        foreach (var t in tokens) t.Revoke(ip);
        db.RefreshTokens.UpdateRange(tokens);
    }
}

// ── SystemConfig ──────────────────────────────────────────────────────────────
public class SystemConfigRepository(AppDbContext db) : ISystemConfigRepository
{
    public Task<SystemConfig?> GetByKeyAsync(string key, CancellationToken ct = default) =>
        db.SystemConfigs.FirstOrDefaultAsync(c => c.Key == key, ct);

    public Task<List<SystemConfig>> GetAllAsync(CancellationToken ct = default) =>
        db.SystemConfigs.OrderBy(c => c.Key).ToListAsync(ct);

    public async Task AddAsync(SystemConfig config, CancellationToken ct = default) =>
        await db.SystemConfigs.AddAsync(config, ct);

    public Task UpdateAsync(SystemConfig config, CancellationToken ct = default)
    {
        db.SystemConfigs.Update(config);
        return Task.CompletedTask;
    }
}

// ── Notification ──────────────────────────────────────────────────────────────
public class NotificationRepository(AppDbContext db) : INotificationRepository
{
    public Task<List<Notification>> GetByUserAsync(Guid userId, bool unreadOnly, int page, int pageSize,
                                                    CancellationToken ct = default)
    {
        var q = db.Notifications.Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        return q.OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync(ct);
    }

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken ct = default) =>
        db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

    public async Task AddAsync(Notification notification, CancellationToken ct = default) =>
        await db.Notifications.AddAsync(notification, ct);

    public Task UpdateAsync(Notification notification, CancellationToken ct = default)
    {
        db.Notifications.Update(notification);
        return Task.CompletedTask;
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        var unread = await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        foreach (var n in unread) n.MarkRead();
        db.Notifications.UpdateRange(unread);
    }
}

// ── AuditLog ──────────────────────────────────────────────────────────────────
public class AuditLogRepository(AppDbContext db) : IAuditLogRepository
{
    public Task<List<AuditLog>> GetAllAsync(int page, int pageSize, CancellationToken ct = default) =>
        db.AuditLogs.OrderByDescending(a => a.CreatedAt)
                    .Skip((page - 1) * pageSize).Take(pageSize)
                    .ToListAsync(ct);

    public Task<List<AuditLog>> GetByUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default) =>
        db.AuditLogs.Where(a => a.UserId == userId)
                    .OrderByDescending(a => a.CreatedAt)
                    .Skip((page - 1) * pageSize).Take(pageSize)
                    .ToListAsync(ct);

    public async Task AddAsync(AuditLog log, CancellationToken ct = default) =>
        await db.AuditLogs.AddAsync(log, ct);
}

// ── UnitOfWork ────────────────────────────────────────────────────────────────
public class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try   { await action(ct); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await action(ct);
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return result;
            }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }
}
