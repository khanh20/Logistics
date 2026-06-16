using LG.Shared.Constants;
using LG.Shared.Common;
using Microsoft.AspNetCore.Mvc;

namespace LG.Core.API.Controllers;

/// <summary>
/// Base controller cho Core API — tự động wrap response trong ApiResponse&lt;T&gt;
/// để đồng nhất format với Auth Service và Module1 Service.
/// </summary>
[ApiController]
[Produces("application/json")]
public abstract class CoreBaseController : ControllerBase
{
    /// <summary>
    /// Lấy UserId từ JWT token hiện tại
    /// </summary>
    protected Guid CurrentUserId => HttpContext.GetCurrentUserId();

    /// <summary>
    /// Wrap result trong ApiResponse — ghi đè ControllerBase.Ok(object?)
    /// để TẤT CẢ response đều có format { success, data, message }
    /// </summary>
    protected new IActionResult Ok(object? value) =>
        base.Ok(ApiResponse<object?>.Ok(value));

    /// <summary>
    /// Typed Ok với message tuỳ chỉnh
    /// </summary>
    protected IActionResult Ok<T>(T data, string message = "Success") =>
        base.Ok(ApiResponse<T>.Ok(data, message));

    /// <summary>
    /// Created response (201) với ApiResponse wrapper
    /// </summary>
    protected IActionResult Created<T>(T data, string message = "Created") =>
        StatusCode(201, ApiResponse<T>.Ok(data, message));
}
