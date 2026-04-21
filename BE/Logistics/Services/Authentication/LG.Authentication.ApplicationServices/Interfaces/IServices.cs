using LG.Authentication.ApplicationServices.DTOs.Auth;
using LG.Authentication.ApplicationServices.DTOs.Role;
using LG.Authentication.ApplicationServices.DTOs.Support;
using LG.Authentication.ApplicationServices.DTOs.User;

namespace LG.Authentication.ApplicationServices.Interfaces;

public interface IAuthService
{
    Task<AuthResponse>    RegisterAsync(RegisterRequest req, CancellationToken ct = default);
    Task<AuthResponse>    LoginAsync(LoginRequest req, string? ip, CancellationToken ct = default);
    Task<RefreshResponse> RefreshTokenAsync(string refreshToken, string? ip, CancellationToken ct = default);
    Task                  LogoutAsync(string refreshToken, string? ip, CancellationToken ct = default);
    Task                  LogoutAllDevicesAsync(Guid userId, string? ip, CancellationToken ct = default);
    Task                  ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct = default);
}

public interface IUserService
{
    Task<PagedResponse<UserListResponse>> GetAllAsync(int page, int pageSize, CancellationToken ct = default);
    Task<UserResponse>  GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserResponse>  GetMeAsync(Guid userId, CancellationToken ct = default);
    Task<UserResponse>  UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct = default);
    Task<UserResponse>  UpdateStatusAsync(Guid userId, UpdateUserStatusRequest req, Guid adminId, CancellationToken ct = default);
    Task                DeleteAsync(Guid userId, Guid adminId, CancellationToken ct = default);
}

public interface IRoleService
{
    Task<List<RoleResponse>>  GetAllAsync(CancellationToken ct = default);
    Task<RoleResponse>        GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<RoleResponse>        CreateAsync(CreateRoleRequest req, CancellationToken ct = default);
    Task<RoleResponse>        UpdateAsync(Guid id, UpdateRoleRequest req, CancellationToken ct = default);
    Task                      DeleteAsync(Guid id, CancellationToken ct = default);
    Task                      AssignRoleAsync(AssignRoleRequest req, Guid adminId, CancellationToken ct = default);
    Task                      RemoveRoleAsync(RemoveRoleRequest req, Guid adminId, CancellationToken ct = default);
    Task<List<RoleSlimResponse>> GetByUserAsync(Guid userId, CancellationToken ct = default);
}

public interface IPermissionService
{
    Task<List<PermissionResponse>> GetAllAsync(CancellationToken ct = default);
    Task<List<PermissionResponse>> GetByRoleAsync(Guid roleId, CancellationToken ct = default);
    Task<List<PermissionResponse>> GetByUserAsync(Guid userId, CancellationToken ct = default);
    Task                           SyncRolePermissionsAsync(SyncRolePermissionsRequest req, CancellationToken ct = default);
}

public interface ISystemConfigService
{
    Task<List<SystemConfigResponse>> GetAllAsync(CancellationToken ct = default);
    Task<SystemConfigResponse>       GetByKeyAsync(string key, CancellationToken ct = default);
    Task<SystemConfigResponse>       UpsertAsync(UpsertConfigRequest req, Guid adminId, CancellationToken ct = default);
}

public interface INotificationService
{
    Task<PagedResponse<NotificationResponse>> GetMyNotificationsAsync(
        Guid userId, bool unreadOnly, int page, int pageSize, CancellationToken ct = default);
    Task<int>  CountUnreadAsync(Guid userId, CancellationToken ct = default);
    Task       SendAsync(SendNotificationRequest req, CancellationToken ct = default);
    Task       MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct = default);
    Task       MarkAllReadAsync(Guid userId, CancellationToken ct = default);
}

public interface IAuditLogService
{
    Task<PagedResponse<AuditLogResponse>> GetAllAsync(int page, int pageSize, CancellationToken ct = default);
    Task<PagedResponse<AuditLogResponse>> GetByUserAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task LogAsync(Guid? userId, string action, string tableName, Guid recordId,
                  string? oldData, string? newData, string? ip, string? userAgent,
                  CancellationToken ct = default);
}

// Cross-cutting: used by other modules to get current user context from token
public interface ICurrentUserService
{
    Guid?        UserId      { get; }
    string?      Email       { get; }
    string?      FullName    { get; }
    List<string> Roles       { get; }
    List<string> Permissions { get; }
    bool         IsAuthenticated { get; }
    bool         HasPermission(string permission);
    bool         HasRole(string role);
}
