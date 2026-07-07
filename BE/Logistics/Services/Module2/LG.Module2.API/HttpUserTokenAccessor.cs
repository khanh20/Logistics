using LG.Module2.ApplicationServices.Interfaces;

namespace LG.Module2.API;

/// Lấy JWT của request hiện tại để forward sang Core (sổ địa chỉ). Đăng ký trong Program.cs
/// cùng AddHttpContextAccessor.
public class HttpUserTokenAccessor(IHttpContextAccessor accessor) : IUserTokenAccessor
{
    public string? BearerToken
    {
        get
        {
            var header = accessor.HttpContext?.Request.Headers.Authorization.FirstOrDefault();
            return header is not null && header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? header["Bearer ".Length..].Trim()
                : null;
        }
    }
}
