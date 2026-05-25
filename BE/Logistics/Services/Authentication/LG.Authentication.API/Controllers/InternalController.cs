using LG.Authentication.ApplicationServices.DTOs.User;
using LG.Authentication.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace LG.Authentication.API.Controllers;

// Endpoints dành cho gọi nội bộ giữa các microservice.
// Không xài JWT — bảo mật bằng header X-Internal-Key (shared secret giữa services).
// Lý do: background jobs không có user context, không thể issue JWT cho từng request.
[ApiController]
[Route("api/internal")]
[AllowAnonymous]
[Produces("application/json")]
public class InternalController(
    IUserService userService,
    IConfiguration config
) : ControllerBase
{
    // Header key bắt buộc, value match Auth:InternalApiKey trong appsettings/env.
    private const string InternalKeyHeader = "X-Internal-Key";

    // GET /api/internal/staff-roster?role=NvMuaHang&activeOnly=true
    // Trả danh sách user có role chỉ định. Module1 dùng cho auto-assign.
    [HttpGet("staff-roster")]
    [ProducesResponseType(typeof(List<StaffRosterItemResponse>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> GetStaffRoster(
        [FromQuery] string role,
        [FromQuery] bool activeOnly = true,
        CancellationToken ct = default)
    {
        if (!IsValidInternalKey())
            return Unauthorized(new { success = false, message = "Invalid internal key.", errorCode = "UNAUTHORIZED_INTERNAL" });

        if (string.IsNullOrWhiteSpace(role))
            return BadRequest(new { success = false, message = "role is required.", errorCode = "VALIDATION_ERROR" });

        var roster = await userService.GetStaffRosterAsync(role, activeOnly, ct);
        return Ok(roster);
    }

    // Constant-time compare để tránh timing attack.
    private bool IsValidInternalKey()
    {
        var expected = config["Auth:InternalApiKey"]
                    ?? Environment.GetEnvironmentVariable("AUTH__INTERNALAPIKEY");
        if (string.IsNullOrEmpty(expected)) return false;

        if (!Request.Headers.TryGetValue(InternalKeyHeader, out var provided))
            return false;

        var providedStr = provided.ToString();
        if (providedStr.Length != expected.Length) return false;

        // FixedTimeEquals — không leak length info qua thời gian compare.
        return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(providedStr),
            System.Text.Encoding.UTF8.GetBytes(expected));
    }
}
