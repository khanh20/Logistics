namespace LG.Module1.Domain.Entities;

// ─── Platform ─────────────────────────────────────────────────────────────────
public class Platform
{
    public Guid    Id               { get; private set; } = Guid.NewGuid();
    public string  Name             { get; private set; } = default!;
    public string  BaseUrl          { get; private set; } = default!;
    public ApiProvider ApiProvider  { get; private set; }
    public string? ApiKey           { get; private set; }   // encrypted at rest
    public string? ApiSecret        { get; private set; }   // encrypted at rest
    public string? CrawlConfigJson  { get; private set; }
    public bool    IsActive         { get; private set; } = true;
    public string? LogoUrl          { get; private set; }
    public DateTime CreatedAt       { get; private set; } = DateTime.UtcNow;

    public ICollection<PlatformShop>    Shops    { get; private set; } = new List<PlatformShop>();
    public ICollection<PlatformAccount> Accounts { get; private set; } = new List<PlatformAccount>();

    private Platform() { }

    public static Platform Create(string name, string baseUrl, ApiProvider apiProvider,
                                   string? apiKey = null, string? apiSecret = null,
                                   string? logoUrl = null) =>
        new()
        {
            Name = name.Trim(), BaseUrl = baseUrl.Trim(), ApiProvider = apiProvider,
            ApiKey = apiKey, ApiSecret = apiSecret, LogoUrl = logoUrl,
        };

    public void Update(string name, string baseUrl, ApiProvider apiProvider, bool isActive)
    {
        Name = name.Trim(); BaseUrl = baseUrl.Trim();
        ApiProvider = apiProvider; IsActive = isActive;
    }

    /// Không trả ApiKey/ApiSecret ra ngoài — chỉ update trong nội bộ.
    public void SetCredentials(string? apiKey, string? apiSecret)
    {
        ApiKey    = apiKey;
        ApiSecret = apiSecret;
    }
}

public enum ApiProvider { Apify, PublicApi, Manual }

// ─── PlatformShop ─────────────────────────────────────────────────────────────
public class PlatformShop
{
    public Guid    Id                    { get; private set; } = Guid.NewGuid();
    public Guid    PlatformId            { get; private set; }
    public string  ShopIdOnPlatform      { get; private set; } = default!;
    public string  ShopName              { get; private set; } = default!;
    public string? ShopUrl               { get; private set; }
    public decimal InternalRating        { get; private set; } = 5.00m;
    public int     TotalProductsCrawled  { get; private set; }
    public decimal? AvgShipDays         { get; private set; }
    public decimal DisputeRate           { get; private set; }
    public bool    IsBlacklisted         { get; private set; }
    public string? BlacklistReason       { get; private set; }
    public DateTime? BlacklistedAt       { get; private set; }
    public DateTime CreatedAt            { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt            { get; private set; } = DateTime.UtcNow;

    public Platform                  Platform { get; private set; } = default!;
    public ICollection<ProductMaster> Products { get; private set; } = new List<ProductMaster>();

    private PlatformShop() { }

    public static PlatformShop Create(Guid platformId, string shopIdOnPlatform,
                                       string shopName, string? shopUrl = null) =>
        new()
        {
            PlatformId = platformId,
            ShopIdOnPlatform = shopIdOnPlatform.Trim(),
            ShopName = shopName.Trim(),
            ShopUrl = shopUrl?.Trim(),
        };

    public void Blacklist(string reason)
    {
        IsBlacklisted  = true;
        BlacklistReason = reason;
        BlacklistedAt  = DateTime.UtcNow;
        Touch();
    }

    public void Unblacklist()
    {
        IsBlacklisted   = false;
        BlacklistReason = null;
        BlacklistedAt   = null;
        Touch();
    }

    public void UpdateStats(int totalCrawled, decimal avgShipDays, decimal disputeRate)
    {
        TotalProductsCrawled = totalCrawled;
        AvgShipDays  = avgShipDays;
        DisputeRate  = disputeRate;
        Touch();
    }

    public void UpdateRating(decimal rating)
    {
        if (rating is < 0 or > 5) throw new ArgumentException("Rating must be between 0 and 5.");
        InternalRating = rating;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ─── PlatformAccount ──────────────────────────────────────────────────────────
public class PlatformAccount
{
    public Guid    Id              { get; private set; } = Guid.NewGuid();
    public Guid    PlatformId      { get; private set; }
    public string  Username        { get; private set; } = default!;
    public string? PasswordEncrypted { get; private set; }
    public decimal AlipayBalance   { get; private set; }
    public decimal DailySpendLimit { get; private set; }
    public decimal DailySpentToday { get; private set; }
    public bool    IsFrozen        { get; private set; }
    public bool    IsActive        { get; private set; } = true;
    public DateTime? LastLoginAt   { get; private set; }
    public DateTime CreatedAt      { get; private set; } = DateTime.UtcNow;

    public Platform Platform { get; private set; } = default!;

    private PlatformAccount() { }

    public static PlatformAccount Create(Guid platformId, string username,
                                          decimal dailySpendLimit,
                                          string? passwordEncrypted = null) =>
        new()
        {
            PlatformId = platformId, Username = username.Trim(),
            DailySpendLimit = dailySpendLimit, PasswordEncrypted = passwordEncrypted,
        };

    public void RecordSpend(decimal amount)
    {
        DailySpentToday += amount;
    }

    public void ResetDailySpend() => DailySpentToday = 0;

    public void Freeze()   { IsFrozen = true;  }
    public void Unfreeze() { IsFrozen = false; }

    public void UpdateBalance(decimal balance) => AlipayBalance = balance;
    public void RecordLogin() => LastLoginAt = DateTime.UtcNow;

    public bool HasDailyCapacity(decimal amount) =>
        !IsFrozen && IsActive && (DailySpentToday + amount <= DailySpendLimit);
}
