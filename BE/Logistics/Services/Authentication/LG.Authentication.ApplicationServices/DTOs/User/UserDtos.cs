using System.ComponentModel.DataAnnotations;
using LG.Authentication.Domain.Entities;

namespace LG.Authentication.ApplicationServices.DTOs.User;

// ── Request ───────────────────────────────────────────────────────────────────
public record UpdateProfileRequest(
    [Required, MaxLength(255)] string  FullName,
    [MaxLength(20)]            string? Phone,
    [MaxLength(500)]           string? AvatarUrl
);

public record UpdateUserStatusRequest(
    [Required] string Status   // "Active" | "Banned" | "Suspended"
);

public record CreateStaffRequest(
    [Required, EmailAddress, MaxLength(255)]     string  Email,
    [Required, MinLength(8), MaxLength(100)]     string  Password,
    [Required, MaxLength(255)]                   string  FullName,
    [MaxLength(20)]                              string? Phone
);

// Tạo user bất kỳ với role do admin chọn
public record CreateUserRequest(
    [Required, EmailAddress, MaxLength(255)] string     Email,
    [Required, MinLength(8), MaxLength(100)] string     Password,
    [Required, MaxLength(255)]              string     FullName,
    [MaxLength(20)]                         string?    Phone,
    List<Guid>?                             RoleIds
);

// ── Response ──────────────────────────────────────────────────────────────────
public record UserResponse(
    Guid         Id,
    string       Email,
    string       FullName,
    string?      Phone,
    string?      AvatarUrl,
    string       Status,
    DateTime?    LastLoginAt,
    DateTime     CreatedAt,
    List<string> Roles
);

public record UserListResponse(
    Guid     Id,
    string   Email,
    string   FullName,
    string?  Phone,
    string   Status,
    DateTime CreatedAt,
    List<string> Roles
);

public record StaffRosterItemResponse(
    Guid   Id,
    string FullName,
    string Email
);

public record PagedResponse<T>(
    List<T> Data,
    int     Page,
    int     PageSize,
    int     TotalCount,
    int     TotalPages
);

public static class UserMapper
{
    public static UserResponse ToResponse(Domain.Entities.User u, List<string> roles) => new(
        u.Id, u.Email, u.FullName, u.Phone, u.AvatarUrl,
        u.Status.ToString(), u.LastLoginAt, u.CreatedAt, roles);

    public static UserListResponse ToListResponse(Domain.Entities.User u, List<string> roles) => new(
        u.Id, u.Email, u.FullName, u.Phone, u.Status.ToString(), u.CreatedAt, roles);
}
