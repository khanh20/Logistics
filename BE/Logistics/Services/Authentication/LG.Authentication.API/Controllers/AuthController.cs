using LG.Authentication.ApplicationServices.DTOs.Auth;
using LG.Authentication.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

[Route("api/auth")]
public class AuthController(IAuthService authService) : BaseController
{
    /// Register a new customer account
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), 201)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest req, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(req, ct);
        return Created(result, "Registration successful.");
    }

    /// Login and receive JWT + refresh token
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req, CancellationToken ct)
    {
        var result = await authService.LoginAsync(req, ClientIp, ct);
        return Ok(result, "Login successful.");
    }

    /// Refresh access token using refresh token
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(RefreshResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        var result = await authService.RefreshTokenAsync(req.RefreshToken, ClientIp, ct);
        return Ok(result);
    }

    /// Logout current device (revoke refresh token)
    [HttpPost("logout")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        await authService.LogoutAsync(req.RefreshToken, ClientIp, ct);
        return Ok<object?>(null, "Logged out successfully.");
    }

    /// Logout all devices
    [HttpPost("logout-all")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        await authService.LogoutAllDevicesAsync(CurrentUserId, ClientIp, ct);
        return Ok<object?>(null, "Logged out from all devices.");
    }

    /// Change password (requires current password)
    [HttpPut("change-password")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        await authService.ChangePasswordAsync(CurrentUserId, req, ct);
        return Ok<object?>(null, "Password changed. Please log in again.");
    }
}
