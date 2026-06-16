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
}
