namespace LG.Module1.Infrastructure.Adapters.Ebay;

public class EbayOptions
{
    public const string SectionName = "Adapters:Ebay";

    /// App ID (Client ID) từ developer.ebay.com → Application Keys.
    public string ClientId { get; set; } = string.Empty;

    /// Cert ID (Client Secret).
    public string ClientSecret { get; set; } = string.Empty;

    /// "Sandbox" hoặc "Production".
    public string Environment { get; set; } = "Sandbox";

    /// Marketplace ID — eBay site dùng cho search. Mặc định EBAY_US.
    public string MarketplaceId { get; set; } = "EBAY_US";

    /// Affiliate Campaign ID (nếu có) — append vào header để track commission.
    public string? AffiliateCampaignId { get; set; }

    public int TimeoutSeconds { get; set; } = 20;

    /// Endpoint OAuth + API tự sinh từ Environment.
    public string BaseUrl =>
        Environment.Equals("Production", StringComparison.OrdinalIgnoreCase)
            ? "https://api.ebay.com"
            : "https://api.sandbox.ebay.com";
}