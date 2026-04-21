namespace LG.Authentication.Domain.Entities;

public class Role
{
    public Guid   Id          { get; private set; } = Guid.NewGuid();
    public string Name        { get; private set; } = default!;
    public string? Description { get; private set; }
    public bool   IsSystem    { get; private set; }      // system roles cannot be deleted
    public bool   IsDefault   { get; private set; }      // auto-assigned on register
    public string Scope       { get; private set; } = "user";   // "user" | "staff"
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<UserRole>       UserRoles       { get; private set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; private set; } = new List<RolePermission>();

    private Role() { }   // EF Core

    public static Role Create(string name, string? description, bool isSystem = false,
                              bool isDefault = false, string scope = "user")
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Role name is required.");
        return new Role
        {
            Name        = name.Trim(),
            Description = description,
            IsSystem    = isSystem,
            IsDefault   = isDefault,
            Scope       = scope,
        };
    }

    public void Update(string name, string? description, string scope)
    {
        if (IsSystem) throw new InvalidOperationException("Cannot modify a system role.");
        Name        = name.Trim();
        Description = description;
        Scope       = scope;
    }
}
