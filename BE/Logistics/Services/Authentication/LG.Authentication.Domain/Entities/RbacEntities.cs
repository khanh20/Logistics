namespace LG.Authentication.Domain.Entities;

public class UserRole
{
    public Guid     Id         { get; private set; } = Guid.NewGuid();
    public Guid     UserId     { get; private set; }
    public Guid     RoleId     { get; private set; }
    public Guid?    AssignedBy { get; private set; }
    public DateTime AssignedAt { get; private set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; private set; } = default!;
    public Role Role { get; private set; } = default!;

    private UserRole() { }

    public static UserRole Create(Guid userId, Guid roleId, Guid? assignedBy) =>
        new() { UserId = userId, RoleId = roleId, AssignedBy = assignedBy };
}

public class Permission
{
    public Guid   Id          { get; private set; } = Guid.NewGuid();
    public string Name        { get; private set; } = default!;   // human-readable
    public string Code        { get; private set; } = default!;   // e.g. "order.create"
    public string ModuleName  { get; private set; } = default!;   // mod1 | mod2 | mod3 | shared
    public string? Description { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<RolePermission> RolePermissions { get; private set; } = new List<RolePermission>();

    private Permission() { }

    public static Permission Create(string name, string code, string moduleName, string? description = null) =>
        new()
        {
            Name        = name.Trim(),
            Code        = code.Trim().ToLowerInvariant(),
            ModuleName  = moduleName,
            Description = description,
        };
}

public class RolePermission
{
    public Guid     Id           { get; private set; } = Guid.NewGuid();
    public Guid     RoleId       { get; private set; }
    public Guid     PermissionId { get; private set; }
    public DateTime GrantedAt    { get; private set; } = DateTime.UtcNow;

    // Navigation
    public Role       Role       { get; private set; } = default!;
    public Permission Permission { get; private set; } = default!;

    private RolePermission() { }

    public static RolePermission Create(Guid roleId, Guid permissionId) =>
        new() { RoleId = roleId, PermissionId = permissionId };
}
