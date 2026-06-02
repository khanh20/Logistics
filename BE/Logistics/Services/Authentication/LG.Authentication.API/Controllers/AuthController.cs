using LG.Authentication.ApplicationServices.DTOs.Auth;
using LG.Authentication.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LG.Authentication.API.Controllers;

[Route("api/auth")]
public class AuthController(
    IAuthService authService,
    IConfiguration config) : BaseController
{
    private const string AccessCookie  = "muaho.access";
    private const string RefreshCookie = "muaho.refresh";

    private CookieOptions BuildCookieOptions(DateTime expires)
    {
        var domain = config["Cookie:Domain"];
        return new CookieOptions
        {
            HttpOnly = true,
            Secure   = true,
            SameSite = SameSiteMode.None,
            Path     = "/",
            Expires  = expires,
            Domain   = string.IsNullOrWhiteSpace(domain) ? null : domain,
        };
    }

    private void SetAuthCookies(AuthResponse r)
    {
        Response.Cookies.Append(AccessCookie,  r.AccessToken,  BuildCookieOptions(r.AccessTokenExpiresAt));
        Response.Cookies.Append(RefreshCookie, r.RefreshToken, BuildCookieOptions(r.RefreshTokenExpiresAt));
    }

    private void ClearAuthCookies()
    {
        var opt = BuildCookieOptions(DateTime.UtcNow.AddDays(-1));
        Response.Cookies.Delete(AccessCookie,  opt);
        Response.Cookies.Delete(RefreshCookie, opt);
    }

    // Register a new customer account
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), 201)]
    [ProducesResponseType(409)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest req, CancellationToken ct)
    {
        var result = await authService.RegisterAsync(req, ct);
        SetAuthCookies(result);   
        return Created(result, "Registration successful.");
    }

    // Login and receive JWT + refresh token
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(AuthResponse), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest req, CancellationToken ct)
    {
        var result = await authService.LoginAsync(req, ClientIp, ct);
        SetAuthCookies(result);
        return Ok(result, "Login successful.");
    }

    // Refresh access token using refresh token
    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [ProducesResponseType(typeof(RefreshResponse), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(429)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        var result = await authService.RefreshTokenAsync(req.RefreshToken, ClientIp, ct);
        Response.Cookies.Append(AccessCookie, result.AccessToken,
            BuildCookieOptions(result.AccessTokenExpiresAt));
        return Ok(result);
    }

    /// Logout current device (revoke refresh token)
    [HttpPost("logout")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> Logout(
        [FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        await authService.LogoutAsync(req.RefreshToken, ClientIp, ct);
        ClearAuthCookies();
        return Ok<object?>(null, "Logged out successfully.");
    }

    /// Logout all devices
    [HttpPost("logout-all")]
    [ProducesResponseType(200)]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        await authService.LogoutAllDevicesAsync(CurrentUserId, ClientIp, ct);
        ClearAuthCookies();
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
