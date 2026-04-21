namespace LG.Authentication.Domain.Entities;

public class RefreshToken
{
    public Guid     Id          { get; private set; } = Guid.NewGuid();
    public Guid     UserId      { get; private set; }
    public string   Token       { get; private set; } = default!;
    public DateTime ExpiresAt   { get; private set; }
    public DateTime CreatedAt   { get; private set; } = DateTime.UtcNow;
    public string?  CreatedByIp { get; private set; }
    public DateTime? RevokedAt  { get; private set; }
    public string?  RevokedByIp { get; private set; }
    public string?  ReplacedBy  { get; private set; }

    public bool IsActive  => RevokedAt == null && !IsExpired;
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

    // Navigation
    public User User { get; private set; } = default!;

    private RefreshToken() { }

    public static RefreshToken Create(Guid userId, string token, DateTime expiresAt, string? ip) =>
        new() { UserId = userId, Token = token, ExpiresAt = expiresAt, CreatedByIp = ip };

    public void Revoke(string? ip, string? replacedBy = null)
    {
        RevokedAt  = DateTime.UtcNow;
        RevokedByIp = ip;
        ReplacedBy  = replacedBy;
    }
}
