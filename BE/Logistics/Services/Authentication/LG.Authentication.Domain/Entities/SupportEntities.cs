namespace LG.Authentication.Domain.Entities;

public class SystemConfig
{
    public Guid      Id          { get; private set; } = Guid.NewGuid();
    public string    Key         { get; private set; } = default!;
    public string    Value       { get; private set; } = default!;
    public ValueType ValueType   { get; private set; } = ValueType.String;
    public string?   Description { get; private set; }
    public Guid?     UpdatedBy   { get; private set; }
    public DateTime  UpdatedAt   { get; private set; } = DateTime.UtcNow;

    private SystemConfig() { }

    public static SystemConfig Create(string key, string value, ValueType valueType, string? description = null) =>
        new() { Key = key.Trim(), Value = value, ValueType = valueType, Description = description };

    public void Update(string value, Guid updatedBy)
    {
        Value     = value;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum ValueType { String, Number, Boolean, Json }

// ─────────────────────────────────────────────────────────

public class Notification
{
    public Guid              Id            { get; private set; } = Guid.NewGuid();
    public Guid              UserId        { get; private set; }
    public string            Title         { get; private set; } = default!;
    public string            Content       { get; private set; } = default!;
    public NotificationType  Type          { get; private set; }
    public string?           ReferenceType { get; private set; }
    public Guid?             ReferenceId   { get; private set; }
    public bool              IsRead        { get; private set; }
    public DateTime?         ReadAt        { get; private set; }
    public DateTime          CreatedAt     { get; private set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; private set; } = default!;

    private Notification() { }

    public static Notification Create(Guid userId, string title, string content,
                                      NotificationType type,
                                      string? referenceType = null, Guid? referenceId = null) =>
        new()
        {
            UserId        = userId,
            Title         = title,
            Content       = content,
            Type          = type,
            ReferenceType = referenceType,
            ReferenceId   = referenceId,
        };

    public void MarkRead()
    {
        IsRead = true;
        ReadAt = DateTime.UtcNow;
    }
}

public enum NotificationType { Order, Payment, Warehouse, System, Promo }

// ─────────────────────────────────────────────────────────

public class AuditLog
{
    public Guid      Id         { get; private set; } = Guid.NewGuid();
    public Guid?     UserId     { get; private set; }
    public string    Action     { get; private set; } = default!;
    public string    TableName  { get; private set; } = default!;
    public Guid      RecordId   { get; private set; }
    public string?   OldData    { get; private set; }   // JSON
    public string?   NewData    { get; private set; }   // JSON
    public string?   IpAddress  { get; private set; }
    public string?   UserAgent  { get; private set; }
    public DateTime  CreatedAt  { get; private set; } = DateTime.UtcNow;

    // Navigation
    public User? User { get; private set; }

    private AuditLog() { }

    public static AuditLog Create(Guid? userId, string action, string tableName, Guid recordId,
                                  string? oldData, string? newData,
                                  string? ipAddress = null, string? userAgent = null) =>
        new()
        {
            UserId    = userId,
            Action    = action,
            TableName = tableName,
            RecordId  = recordId,
            OldData   = oldData,
            NewData   = newData,
            IpAddress = ipAddress,
            UserAgent = userAgent,
        };
}
