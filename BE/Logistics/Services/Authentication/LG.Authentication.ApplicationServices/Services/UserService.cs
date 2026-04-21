using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Exceptions;
using LG.Authentication.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.ApplicationServices.Services;

public class UserService(
    IUserRepository userRepo,
    IAuditLogRepository auditRepo,   
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    ILogger<UserService> logger
) : IUserService
{
    public async Task<PagedResponse<UserListResponse>> GetAllAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var users = await userRepo.GetAllAsync(page, pageSize, ct);
        var totalCount = await userRepo.CountAsync(ct);

        var items = users.Select(u =>
            UserMapper.ToListResponse(u, u.UserRoles.Select(ur => ur.Role.Name).ToList())
        ).ToList();

        return new PagedResponse<UserListResponse>(
            items, page, pageSize, totalCount,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(id, ct)
                   ?? throw new NotFoundException(nameof(User), id);
        return UserMapper.ToResponse(user, user.UserRoles.Select(ur => ur.Role.Name).ToList());
    }

    public async Task<UserResponse> GetMeAsync(Guid userId, CancellationToken ct = default) =>
        await GetByIdAsync(userId, ct);

    public async Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        var oldData = System.Text.Json.JsonSerializer.Serialize(
            new { user.FullName, user.Phone, user.AvatarUrl });
        var newData = System.Text.Json.JsonSerializer.Serialize(
            new { req.FullName, req.Phone, req.AvatarUrl });

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            user.UpdateProfile(req.FullName, req.Phone, req.AvatarUrl);
            await userRepo.UpdateAsync(user, innerCt);

            var log = AuditLog.Create(userId, "UPDATE", "users", userId,
                oldData, newData, null, null);
            await auditRepo.AddAsync(log, innerCt);
        }, ct);

        logger.LogInformation("Profile updated for user: {UserId}", userId);

        return UserMapper.ToResponse(user, user.UserRoles.Select(ur => ur.Role.Name).ToList());
    }

    public async Task<UserResponse> UpdateStatusAsync(Guid userId, UpdateUserStatusRequest req,
                                                        Guid adminId, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        var oldStatus = user.Status.ToString();

        switch (req.Status.ToLowerInvariant())
        {
            case "active": user.Activate(); break;
            case "banned": user.Ban(); break;
            case "suspended": user.Suspend(); break;
            default: throw new ValidationException($"Unknown status: {req.Status}");
        }

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await userRepo.UpdateAsync(user, innerCt);

            var log = AuditLog.Create(adminId, "UPDATE_STATUS", "users", userId,
                System.Text.Json.JsonSerializer.Serialize(new { Status = oldStatus }),
                System.Text.Json.JsonSerializer.Serialize(new { req.Status }),
                null, null);
            await auditRepo.AddAsync(log, innerCt);
        }, ct);

        logger.LogInformation("Status updated for user: {UserId} → {Status}", userId, req.Status);

        return UserMapper.ToResponse(user, user.UserRoles.Select(ur => ur.Role.Name).ToList());
    }

    public async Task DeleteAsync(Guid userId, Guid adminId, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        if (userId == adminId)
            throw new ValidationException("Cannot delete your own account.");

        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await userRepo.DeleteAsync(user, innerCt);

            var log = AuditLog.Create(adminId, "DELETE", "users", userId,
                System.Text.Json.JsonSerializer.Serialize(new { user.Email, user.FullName }),
                null, null, null);
            await auditRepo.AddAsync(log, innerCt);
        }, ct);

        logger.LogInformation("User deleted: {UserId} by admin: {AdminId}", userId, adminId);
    }
}