using LG.Authentication.ApplicationServices.Interfaces;
using LG.Authentication.ApplicationServices.Services;
using Microsoft.Extensions.DependencyInjection;

namespace LG.Authentication.ApplicationServices;

public static class ApplicationServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService,         AuthService>();
        services.AddScoped<IUserService,         UserService>();
        services.AddScoped<IRoleService,         RoleService>();
        services.AddScoped<IPermissionService,   PermissionService>();
        services.AddScoped<ISystemConfigService, SystemConfigService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAuditLogService,     AuditLogService>();
        services.AddScoped<ICurrentUserService,  CurrentUserService>();

        return services;
    }
}
