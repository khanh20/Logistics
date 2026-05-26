using LG.Authentication.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LG.Authentication.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>             Users             => Set<User>();
    public DbSet<Role>             Roles             => Set<Role>();
    public DbSet<UserRole>         UserRoles         => Set<UserRole>();
    public DbSet<Permission>       Permissions       => Set<Permission>();
    public DbSet<RolePermission>   RolePermissions   => Set<RolePermission>();
    public DbSet<RefreshToken>     RefreshTokens     => Set<RefreshToken>();
    public DbSet<SystemConfig>     SystemConfigs     => Set<SystemConfig>();
    public DbSet<Notification>     Notifications     => Set<Notification>();
    public DbSet<AuditLog>         AuditLogs         => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("auth");
        mb.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // UTC converter for all DateTime / DateTime?
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v == null ? null : v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime(),
            v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

        foreach (var entity in mb.Model.GetEntityTypes())
        foreach (var prop in entity.GetProperties())
        {
            if (prop.ClrType == typeof(DateTime))  prop.SetValueConverter(utcConverter);
            if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullConverter);
        }
    }
}
