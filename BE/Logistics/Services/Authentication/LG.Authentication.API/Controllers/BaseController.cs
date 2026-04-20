using LG.Authentication.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Authentication.API.Controllers;

[ApiController]
[Authorize]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    protected ICurrentUserService CurrentUser =>
        HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();

    protected Guid CurrentUserId =>
        CurrentUser.UserId ?? throw new UnauthorizedAccessException("Not authenticated.");

    protected string? ClientIp =>
        HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? Request.Headers["X-Forwarded-For"].FirstOrDefault();

    protected IActionResult Ok<T>(T data, string message = "Success") =>
        base.Ok(ApiResponse<T>.Ok(data, message));

    protected IActionResult Created<T>(T data, string message = "Created") =>
        StatusCode(201, ApiResponse<T>.Ok(data, message));
}
