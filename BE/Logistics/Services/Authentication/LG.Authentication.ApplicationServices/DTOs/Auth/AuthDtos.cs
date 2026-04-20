using System.ComponentModel.DataAnnotations;

namespace LG.Authentication.ApplicationServices.DTOs.Auth;

// ── Request ───────────────────────────────────────────────────────────────────
public record RegisterRequest(
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password,
    [Required, MaxLength(255)]              string FullName,
    [MaxLength(20)]                         string? Phone
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required]               string Password
);

public record RefreshTokenRequest(
    [Required] string RefreshToken
);

public record ChangePasswordRequest(
    [Required]               string CurrentPassword,
    [Required, MinLength(8)] string NewPassword
);

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string NewPassword
);

// ── Response ──────────────────────────────────────────────────────────────────
public record AuthResponse(
    string       AccessToken,
    string       RefreshToken,
    DateTime     AccessTokenExpiresAt,
    DateTime     RefreshTokenExpiresAt,
    UserAuthInfo User
);

public record UserAuthInfo(
    Guid         Id,
    string       Email,
    string       FullName,
    string?      AvatarUrl,
    List<string> Roles,
    List<string> Permissions
);

public record RefreshResponse(
    string   AccessToken,
    DateTime AccessTokenExpiresAt
);
