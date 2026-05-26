using LG.Authentication.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LG.Authentication.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("users");
        b.HasKey(x => x.Id);
        b.Property(x => x.Email).HasMaxLength(255).IsRequired();
        b.HasIndex(x => x.Email).IsUnique();
        b.Property(x => x.Phone).HasMaxLength(20);
        b.Property(x => x.PasswordHash).IsRequired();
        b.Property(x => x.FullName).HasMaxLength(255);
        b.Property(x => x.AvatarUrl).HasMaxLength(500);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);

        b.HasMany(x => x.UserRoles).WithOne(x => x.User).HasForeignKey(x => x.UserId);
        b.HasMany(x => x.Notifications).WithOne(x => x.User).HasForeignKey(x => x.UserId);
        b.HasMany(x => x.AuditLogs).WithOne(x => x.User).HasForeignKey(x => x.UserId)
         .IsRequired(false);
    }
}

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> b)
    {
        b.ToTable("roles");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();
        b.Property(x => x.Scope).HasMaxLength(10).HasDefaultValue("user");

        b.HasMany(x => x.UserRoles).WithOne(x => x.Role).HasForeignKey(x => x.RoleId);
        b.HasMany(x => x.RolePermissions).WithOne(x => x.Role).HasForeignKey(x => x.RoleId);

        // Seed system roles
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000001"), Roles.Admin,     "Quản trị viên hệ thống",   isSystem: true,  isDefault: false, scope: "staff",  now),
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000002"), Roles.NvMuaHang, "Nhân viên mua hàng",       isSystem: true,  isDefault: false, scope: "staff",  now),
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000003"), Roles.NvKho,     "Nhân viên kho",            isSystem: true,  isDefault: false, scope: "staff",  now),
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000004"), Roles.KeToan,    "Kế toán",                  isSystem: true,  isDefault: false, scope: "staff",  now),
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000005"), Roles.NvCskh,    "Nhân viên CSKH",           isSystem: true,  isDefault: false, scope: "staff",  now),
            CreateRole(Guid.Parse("00000000-0000-0000-0000-000000000006"), Roles.KhachHang, "Khách hàng",               isSystem: true,  isDefault: true,  scope: "user",   now)
        );
    }

    private static object CreateRole(Guid id, string name, string desc,
                                     bool isSystem, bool isDefault, string scope, DateTime now) =>
        new { Id = id, Name = name, Description = desc, IsSystem = isSystem,
              IsDefault = isDefault, Scope = scope, CreatedAt = now };
}

public class UserRoleConfiguration : IEntityTypeConfiguration<UserRole>
{
    public void Configure(EntityTypeBuilder<UserRole> b)
    {
        b.ToTable("user_roles");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.UserId, x.RoleId }).IsUnique();
    }
}

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> b)
    {
        b.ToTable("permissions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Code).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.ModuleName).HasMaxLength(20);

        b.HasMany(x => x.RolePermissions).WithOne(x => x.Permission)
         .HasForeignKey(x => x.PermissionId);
    }
}

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> b)
    {
        b.ToTable("role_permissions");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.RoleId, x.PermissionId }).IsUnique();
    }
}

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("refresh_tokens");
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Token).IsUnique();
        b.Property(x => x.Token).HasMaxLength(512).IsRequired();
        b.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SystemConfigConfiguration : IEntityTypeConfiguration<SystemConfig>
{
    public void Configure(EntityTypeBuilder<SystemConfig> b)
    {
        b.ToTable("system_configs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Key).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Key).IsUnique();
        b.Property(x => x.ValueType).HasConversion<string>().HasMaxLength(20);
    }
}

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> b)
    {
        b.ToTable("notifications");
        b.HasKey(x => x.Id);
        b.Property(x => x.Title).HasMaxLength(255).IsRequired();
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ReferenceType).HasMaxLength(50);
    }
}

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("audit_logs");
        b.HasKey(x => x.Id);
        b.Property(x => x.Action).HasMaxLength(50).IsRequired();
        b.Property(x => x.TableName).HasMaxLength(100).IsRequired();
        b.Property(x => x.IpAddress).HasMaxLength(45);
        b.Property(x => x.OldData).HasColumnType("jsonb");
        b.Property(x => x.NewData).HasColumnType("jsonb");
    }
}
