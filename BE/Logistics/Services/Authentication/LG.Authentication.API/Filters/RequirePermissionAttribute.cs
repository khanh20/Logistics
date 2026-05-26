using LG.Authentication.ApplicationServices.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace LG.Authentication.API.Filters;

/// Permission-based authorization attribute.
/// Usage: [RequirePermission(Permissions.UserRead)]
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute(params string[] permissions) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var currentUser = context.HttpContext.RequestServices
                           .GetRequiredService<ICurrentUserService>();

        if (!currentUser.IsAuthenticated)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var hasAll = permissions.All(currentUser.HasPermission);
        if (!hasAll)
        {
            context.Result = new ForbidResult();
        }
    }
}
