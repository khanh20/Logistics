namespace LG.Authentication.Domain.Entities;

public class User
{
    public Guid   Id           { get; private set; } = Guid.NewGuid();
    public string Email        { get; private set; } = default!;
    public string? Phone       { get; private set; }
    public string PasswordHash { get; private set; } = default!;
    public string FullName     { get; private set; } = default!;
    public string? AvatarUrl   { get; private set; }
    public UserStatus Status   { get; private set; } = UserStatus.Active;
    public DateTime? LastLoginAt { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; private set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<UserRole> UserRoles { get; private set; } = new List<UserRole>();
    public ICollection<Notification> Notifications { get; private set; } = new List<Notification>();
    public ICollection<AuditLog> AuditLogs { get; private set; } = new List<AuditLog>();

    private User() { }   // EF Core

    public static User Create(string email, string passwordHash, string fullName, string? phone = null)
    {
        if (string.IsNullOrWhiteSpace(email))       throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(passwordHash)) throw new ArgumentException("PasswordHash is required.");
        if (string.IsNullOrWhiteSpace(fullName))     throw new ArgumentException("FullName is required.");

        return new User
        {
            Email        = email.Trim().ToLowerInvariant(),
            PasswordHash = passwordHash,
            FullName     = fullName.Trim(),
            Phone        = phone?.Trim(),
        };
    }

    public void UpdateProfile(string fullName, string? phone, string? avatarUrl)
    {
        FullName  = fullName.Trim();
        Phone     = phone?.Trim();
        AvatarUrl = avatarUrl;
        Touch();
    }

    public void ChangePasswordHash(string newHash)
    {
        PasswordHash = newHash;
        Touch();
    }

    public void RecordLogin()
    {
        LastLoginAt = DateTime.UtcNow;
        Touch();
    }

    public void Ban()
    {
        Status = UserStatus.Banned;
        Touch();
    }

    public void Suspend()
    {
        Status = UserStatus.Suspended;
        Touch();
    }

    public void Activate()
    {
        Status = UserStatus.Active;
        Touch();
    }

    public bool IsActive => Status == UserStatus.Active;

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

public enum UserStatus { Active, Banned, Suspended }
