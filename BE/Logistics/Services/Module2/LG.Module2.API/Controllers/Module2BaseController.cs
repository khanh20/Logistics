using Microsoft.AspNetCore.Mvc;
using LG.Shared.Constants;

namespace LG.Module2.API.Controllers;

[ApiController]
public abstract class Module2BaseController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(HttpContext.User.FindFirst(UserClaimTypes.UserId)?.Value
            ?? throw new UnauthorizedAccessException("UserId claim not found."));

    protected string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? Request.Headers["X-Forwarded-For"].FirstOrDefault();

    /// User hiện tại có permission này không (claim type "permission" — khớp policy trong Program.cs).
    protected bool HasPermission(string code) =>
        HttpContext.User.HasClaim(UserClaimTypes.Permission, code);
}
