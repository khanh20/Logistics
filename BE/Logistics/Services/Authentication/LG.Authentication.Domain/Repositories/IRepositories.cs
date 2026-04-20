using LG.Authentication.Domain.Entities;

namespace LG.Authentication.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<bool>  ExistsByEmailAsync(string email, CancellationToken ct = default);
    Task<List<User>> GetAllAsync(int page, int pageSize, CancellationToken ct = default);
    Task<int>   CountAsync(CancellationToken ct = default);
    Task        AddAsync(User user, CancellationToken ct = default);
    Task        UpdateAsync(User user, CancellationToken ct = default);
    Task        DeleteAsync(User user, CancellationToken ct = default);
    Task<List<string>> GetPermissionCodesAsync(Guid userId, CancellationToken ct = default);
    Task<List<string>> GetRoleNamesAsync(Guid userId, CancellationToken ct = default);
}

public interface IRoleRepository
{
    Task<Role?>      GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Role?>      GetByNameAsync(string name, CancellationToken ct = default);
    Task<Role?>      GetDefaultRoleAsync(CancellationToken ct = default);
    Task<List<Role>> GetAllAsync(CancellationToken ct = default);
    Task             AddAsync(Role role, CancellationToken ct = default);
    Task             UpdateAsync(Role role, CancellationToken ct = default);
    Task             DeleteAsync(Role role, CancellationToken ct = default);
}

public interface IUserRoleRepository
{
    Task<List<UserRole>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<bool>  ExistsAsync(Guid userId, Guid roleId, CancellationToken ct = default);
    Task        AddAsync(UserRole userRole, CancellationToken ct = default);
    Task        RemoveAsync(UserRole userRole, CancellationToken ct = default);
    Task        RemoveRangeAsync(IEnumerable<UserRole> userRoles, CancellationToken ct = default);
}

public interface IPermissionRepository
{
    Task<Permission?>      GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Permission?>      GetByCodeAsync(string code, CancellationToken ct = default);
    Task<List<Permission>> GetAllAsync(CancellationToken ct = default);
    Task<List<Permission>> GetByRoleIdAsync(Guid roleId, CancellationToken ct = default);
    Task                   AddAsync(Permission permission, CancellationToken ct = default);
    Task                   AddRangeAsync(IEnumerable<Permission> permissions, CancellationToken ct = default);
}

public interface IRolePermissionRepository
{
    Task<List<RolePermission>> GetByRoleIdAsync(Guid roleId, CancellationToken ct = default);
    Task        AddAsync(RolePermission rp, CancellationToken ct = default);
    Task        AddRangeAsync(IEnumerable<RolePermission> rps, CancellationToken ct = default);
    Task        RemoveAsync(RolePermission rp, CancellationToken ct = default);
    Task        RemoveRangeAsync(IEnumerable<RolePermission> rps, CancellationToken ct = default);
    Task<bool>  ExistsAsync(Guid roleId, Guid permissionId, CancellationToken ct = default);
}

public interface IRefreshTokenRepository
{
    Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken ct = default);
    Task<List<RefreshToken>> GetActiveByUserAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(RefreshToken token, CancellationToken ct = default);
    Task UpdateAsync(RefreshToken token, CancellationToken ct = default);
    Task RevokeAllForUserAsync(Guid userId, string? ip, CancellationToken ct = default);
}

public interface ISystemConfigRepository
{
    Task<SystemConfig?>      GetByKeyAsync(string key, CancellationToken ct = default);
    Task<List<SystemConfig>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(SystemConfig config, CancellationToken ct = default);
    Task UpdateAsync(SystemConfig config, CancellationToken ct = default);
}

public interface INotificationRepository
{
    Task<List<Notification>> GetByUserAsync(Guid userId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default);
    Task<int>  CountUnreadAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Notification notification, CancellationToken ct = default);
    Task UpdateAsync(Notification notification, CancellationToken ct = default);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);
}

public interface IAuditLogRepository
{
    Task<List<AuditLog>> GetAllAsync(int page, int pageSize, CancellationToken ct = default);
    Task<List<AuditLog>> GetByUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(AuditLog log, CancellationToken ct = default);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}
