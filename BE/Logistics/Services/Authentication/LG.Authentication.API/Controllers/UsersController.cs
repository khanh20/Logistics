using LG.Authentication.API.Filters;
using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.Infrastructure.Services;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

[Route("api/users")]
public class UsersController(IUserService userService, IUploadAvatar uploadAvatarService) : BaseController
{
    /// Get current authenticated user's profile
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var result = await userService.GetMeAsync(CurrentUserId, ct);
        return Ok(result);
    }

    /// Update own profile
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<IActionResult> UpdateMe(
        [FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var result = await userService.UpdateProfileAsync(CurrentUserId, req, ct);
        return Ok(result, "Profile updated.");
    }

    /// Upload new avatar
    [HttpPost("me/avatar")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UserResponse), 200)]
    public async Task<IActionResult> UploadAvatar(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Image is required." });
        }

        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!Array.Exists(allowedTypes, t => t.Equals(file.ContentType, StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { message = "Invalid image type. Allowed: jpeg, jpg, png, webp." });
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { message = "Image size cannot exceed 5MB." });
        }

        var avatarUrl = await uploadAvatarService.UploadImageAsync(file);
        if (string.IsNullOrEmpty(avatarUrl))
        {
            return StatusCode(500, new { message = "Failed to upload image." });
        }

        var currentUser = await userService.GetMeAsync(CurrentUserId, ct);
        var updateReq = new UpdateProfileRequest(currentUser.FullName, currentUser.Phone, avatarUrl);
        var result = await userService.UpdateProfileAsync(CurrentUserId, updateReq, ct);

        return Ok(result, "Avatar updated.");
    }

    /// List all users for staff management (Admin only)
    [HttpGet("staff")]
    [RequirePermission(Permissions.UserRead)]
    [ProducesResponseType(typeof(PagedResponse<UserListResponse>), 200)]
    public async Task<IActionResult> GetStaff(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 200,
        CancellationToken ct = default)
    {
        var result = await userService.GetAllAsync(page, pageSize, ct);
        return Ok(result);
    }

    /// Create a new staff account (Admin only)
    [HttpPost("staff")]
    [RequirePermission(Permissions.UserManage)]
    [ProducesResponseType(typeof(UserListResponse), 200)]
    public async Task<IActionResult> CreateStaff([FromBody] CreateStaffRequest req, CancellationToken ct)
    {
        var result = await userService.CreateStaffAsync(req, CurrentUserId, ct);
        return Ok(result, "Staff account created.");
    }

    /// List all users (Admin only)
    [HttpGet]
    [RequirePermission(Permissions.UserRead)]
    [ProducesResponseType(typeof(PagedResponse<UserListResponse>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await userService.GetAllAsync(page, pageSize, ct);
        return Ok(result);
    }

    /// Create a user with admin-selected roles (Admin only)
    [HttpPost]
    [RequirePermission(Permissions.UserManage)]
    [ProducesResponseType(typeof(UserListResponse), 200)]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req, CancellationToken ct)
    {
        var result = await userService.CreateUserAsync(req, CurrentUserId, ct);
        return Ok(result, "User account created.");
    }

    /// Get user by ID (Admin / Staff)
    [HttpGet("{id:guid}")]
    [RequirePermission(Permissions.UserRead)]
    [ProducesResponseType(typeof(UserResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await userService.GetByIdAsync(id, ct);
        return Ok(result);
    }

    /// Update any user's profile (Admin only)
    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.UserUpdate)]
    [ProducesResponseType(typeof(UserResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateProfile(
        Guid id, [FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var result = await userService.UpdateProfileAsync(id, req, ct);
        return Ok(result, "Profile updated.");
    }

    /// Ban / suspend / activate user (Admin only)
    [HttpPatch("{id:guid}/status")]
    [RequirePermission(Permissions.UserManage)]
    [ProducesResponseType(typeof(UserResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> UpdateStatus(
        Guid id, [FromBody] UpdateUserStatusRequest req, CancellationToken ct)
    {
        var result = await userService.UpdateStatusAsync(id, req, CurrentUserId, ct);
        return Ok(result, "User status updated.");
    }

    /// Delete user (Admin only)
    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.UserDelete)]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await userService.DeleteAsync(id, CurrentUserId, ct);
        return Ok<object?>(null, "User deleted.");
    }
}
