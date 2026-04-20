using LG.Authentication.ApplicationServices.DTOs.Auth;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Domain.Entities;
using LG.Authentication.Domain.Exceptions;
using LG.Authentication.Domain.Repositories;
using LG.Authentication.Infrastructure.Security;
using LG.Shared.Constants;
using Microsoft.Extensions.Logging;

namespace LG.Authentication.ApplicationServices.Services;

public class AuthService(
    IUserRepository         userRepo,
    IRoleRepository         roleRepo,
    IUserRoleRepository     userRoleRepo,
    IRefreshTokenRepository rtRepo,
    IUnitOfWork             uow,
    IPasswordHasher         hasher,
    ITokenService           tokenSvc,
    ILogger<AuthService>    logger
) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest req, CancellationToken ct = default)
    {
        if (await userRepo.ExistsByEmailAsync(req.Email, ct))
            throw new ConflictException($"Email '{req.Email}' is already registered.");

        var user = User.Create(req.Email, hasher.Hash(req.Password), req.FullName, req.Phone);

        await userRepo.AddAsync(user, ct);
        await uow.SaveChangesAsync(ct);

        // Assign default role
        var defaultRole = await roleRepo.GetDefaultRoleAsync(ct);
        if (defaultRole is null) throw new InvalidOperationException("Default role not configured.");

        await userRoleRepo.AddAsync(UserRole.Create(user.Id, defaultRole.Id, null), ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("User registered: {Email}", user.Email);

        return await BuildAuthResponseAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest req, string? ip, CancellationToken ct = default)
    {
        var user = await userRepo.GetByEmailAsync(req.Email, ct)
                   ?? throw new UnauthorizedException("Invalid email or password.");

        if (!user.IsActive)
            throw new AccountLockedException();

        if (!hasher.Verify(req.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        user.RecordLogin();
        await userRepo.UpdateAsync(user, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("User logged in: {Email} from {Ip}", user.Email, ip);

        return await BuildAuthResponseAsync(user, ct, ip);
    }

    public async Task<RefreshResponse> RefreshTokenAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var rt = await rtRepo.GetByTokenAsync(refreshToken, ct)
                 ?? throw new InvalidTokenException();

        if (!rt.IsActive) throw new InvalidTokenException("Refresh token has been revoked or expired.");

        var user = rt.User;
        if (!user.IsActive) throw new AccountLockedException();

        var roles       = await userRepo.GetRoleNamesAsync(user.Id, ct);
        var permissions = await userRepo.GetPermissionCodesAsync(user.Id, ct);

        var newAccess = tokenSvc.GenerateAccessToken(user, roles, permissions);
        var expiresAt = DateTime.UtcNow.AddMinutes(30);

        logger.LogInformation("Token refreshed for user: {UserId}", user.Id);

        return new RefreshResponse(newAccess, expiresAt);
    }

    public async Task LogoutAsync(string refreshToken, string? ip, CancellationToken ct = default)
    {
        var rt = await rtRepo.GetByTokenAsync(refreshToken, ct);
        if (rt is null || !rt.IsActive) return;  // idempotent

        rt.Revoke(ip);
        await rtRepo.UpdateAsync(rt, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("User logged out, token revoked for user: {UserId}", rt.UserId);
    }

    public async Task LogoutAllDevicesAsync(Guid userId, string? ip, CancellationToken ct = default)
    {
        await rtRepo.RevokeAllForUserAsync(userId, ip, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("All devices logged out for user: {UserId}", userId);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest req, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId, ct)
                   ?? throw new NotFoundException(nameof(User), userId);

        if (!hasher.Verify(req.CurrentPassword, user.PasswordHash))
            throw new ValidationException("Current password is incorrect.");

        user.ChangePasswordHash(hasher.Hash(req.NewPassword));
        await userRepo.UpdateAsync(user, ct);

        // Revoke all refresh tokens — force re-login on all devices
        await rtRepo.RevokeAllForUserAsync(userId, null, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Password changed for user: {UserId}", userId);
    }

    // ── Private ───────────────────────────────────────────────────────────────
    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken ct, string? ip = null)
    {
        var roles       = await userRepo.GetRoleNamesAsync(user.Id, ct);
        var permissions = await userRepo.GetPermissionCodesAsync(user.Id, ct);

        var accessToken = tokenSvc.GenerateAccessToken(user, roles, permissions);
        var rt          = tokenSvc.GenerateRefreshToken(user.Id, ip);

        await rtRepo.AddAsync(rt, ct);
        await uow.SaveChangesAsync(ct);

        return new AuthResponse(
            AccessToken:            accessToken,
            RefreshToken:           rt.Token,
            AccessTokenExpiresAt:   DateTime.UtcNow.AddMinutes(30),
            RefreshTokenExpiresAt:  rt.ExpiresAt,
            User: new UserAuthInfo(user.Id, user.Email, user.FullName, user.AvatarUrl, roles, permissions)
        );
    }
}
