using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Exceptions;
using LG.Authentication.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.ApplicationServices.Services;

public class UserService(
    IUserRepository      userRepo,
    IUnitOfWork          uow,
    IAuditLogService     audit,
    ICurrentUserService  currentUser,
    ILogger<UserService> logger
) : IUserService
{
    public async Task<PagedResponse<UserListResponse>> GetAllAsync(int page, int pageSize, CancellationToken ct = default)
    {
        var users      = await userRepo.GetAllAsync(page, pageSize, ct);
        var totalCount = await userRepo.CountAsync(ct);

        var items = new List<UserListResponse>();
        foreach (var u in users)
        {
            var roles = u.UserRoles.Select(ur => ur.Role.Name).ToList();
            items.Add(UserMapper.ToListResponse(u, roles));
        }

        return new PagedResponse<UserListResponse>(
            items, page, pageSize, totalCount,
            (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(id, ct)
                   ?? throw new NotFoundException(nameof(User), id);

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return UserMapper.ToResponse(user, roles);
    }

    public async Task<UserResponse> GetMeAsync(Guid userId, CancellationToken ct = default) =>
        await GetByIdAsync(userId, ct);

    public async Task<UserResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest req, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        var oldData = System.Text.Json.JsonSerializer.Serialize(new { user.FullName, user.Phone, user.AvatarUrl });

        user.UpdateProfile(req.FullName, req.Phone, req.AvatarUrl);
        await userRepo.UpdateAsync(user, ct);
        await uow.SaveChangesAsync(ct);

        var newData = System.Text.Json.JsonSerializer.Serialize(new { req.FullName, req.Phone, req.AvatarUrl });
        await audit.LogAsync(userId, "UPDATE", "users", userId, oldData, newData, null, null, ct);

        logger.LogInformation("Profile updated for user: {UserId}", userId);

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return UserMapper.ToResponse(user, roles);
    }

    public async Task<UserResponse> UpdateStatusAsync(Guid userId, UpdateUserStatusRequest req,
                                                        Guid adminId, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        var oldStatus = user.Status.ToString();

        switch (req.Status.ToLowerInvariant())
        {
            case "active":    user.Activate(); break;
            case "banned":    user.Ban();      break;
            case "suspended": user.Suspend();  break;
            default: throw new ValidationException($"Unknown status: {req.Status}");
        }

        await userRepo.UpdateAsync(user, ct);
        await uow.SaveChangesAsync(ct);

        await audit.LogAsync(adminId, "UPDATE_STATUS", "users", userId,
            System.Text.Json.JsonSerializer.Serialize(new { Status = oldStatus }),
            System.Text.Json.JsonSerializer.Serialize(new { req.Status }), null, null, ct);

        logger.LogInformation("Status updated for user: {UserId} → {Status}", userId, req.Status);

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        return UserMapper.ToResponse(user, roles);
    }

    public async Task DeleteAsync(Guid userId, Guid adminId, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        if (userId == adminId)
            throw new ValidationException("Cannot delete your own account.");

        await userRepo.DeleteAsync(user, ct);
        await uow.SaveChangesAsync(ct);

        await audit.LogAsync(adminId, "DELETE", "users", userId, null, null, null, null, ct);

        logger.LogInformation("User deleted: {UserId} by admin: {AdminId}", userId, adminId);
    }
}
