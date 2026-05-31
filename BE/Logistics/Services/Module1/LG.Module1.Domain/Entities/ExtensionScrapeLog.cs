namespace LG.Module1.Domain.Entities;

// Log mỗi lần Chrome Extension scrape sản phẩm và gửi về backend.
// Dùng cho analytics: shop nào hay fail, tier nào hay được dùng cho Rakuten → improve adapter.
public class ExtensionScrapeLog
{
    public Guid    Id                { get; private set; } = Guid.NewGuid();
    public Guid    CustomerId        { get; private set; }
    public string  Platform          { get; private set; } = default!;   // "TAOBAO" | "TMALL" | "1688" | "RAKUTEN"
    public string  PlatformProductId { get; private set; } = default!;
    public string  Url               { get; private set; } = default!;
    public string? ExtensionVersion  { get; private set; }
    public bool    Success           { get; private set; }
    public string? ErrorMessage      { get; private set; }
    // "high" | "medium" | "low" — chỉ có ý nghĩa cho Rakuten (multi-tier extraction).
    public string? ConfidenceTier    { get; private set; }
    public DateTime CreatedAt        { get; private set; } = DateTime.UtcNow;

    private ExtensionScrapeLog() { }

    public static ExtensionScrapeLog Create(Guid customerId, string platform,
                                             string platformProductId, string url,
                                             string? extensionVersion, bool success,
                                             string? errorMessage = null,
                                             string? confidenceTier = null) =>
        new()
        {
            CustomerId        = customerId,
            Platform          = platform.Trim().ToUpperInvariant(),
            PlatformProductId = platformProductId.Trim(),
            Url               = url.Trim(),
            ExtensionVersion  = extensionVersion?.Trim(),
            Success           = success,
            ErrorMessage      = errorMessage,
            ConfidenceTier    = confidenceTier?.Trim().ToLowerInvariant(),
        };
}
