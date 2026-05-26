using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

[ApiController]
public abstract class Module2BaseController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(HttpContext.User.FindFirst("userId")?.Value
            ?? throw new UnauthorizedAccessException("UserId claim not found."));

    protected string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? Request.Headers["X-Forwarded-For"].FirstOrDefault();
}
