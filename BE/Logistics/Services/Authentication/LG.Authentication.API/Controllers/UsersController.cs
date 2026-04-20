using LG.Authentication.API.Filters;
using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

[Route("api/users")]
public class UsersController(IUserService userService) : BaseController
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
