using System.ComponentModel.DataAnnotations;
using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.DTOs.Product;

namespace LG.Module1.ApplicationServices.DTOs.Ingestion;

// ── Requests ──────────────────────────────────────────────────────────────────
public record CrawlByKeywordRequest(
    [Required, MaxLength(50)] string PlatformName,    // "eBay", "Rakuten"
    [Required, MaxLength(200)] string Keyword,
    [Range(1, 100)] int MaxResults = 20,
    Guid? CategoryId = null   // Optional: gán category cho mọi sản phẩm crawl
);

public record CrawlByUrlRequest(
    [Required, MaxLength(2000)] string Url,                  // URL sản phẩm trên sàn
    Guid? CategoryId = null
);

// ── Resolve URL (customer dán link trên web) ───────────────────────────────────
// Hai chế độ:
//  - ScrapedData != null: extension đã scrape sẵn (1688/Taobao/Tmall) → backend chỉ upsert.
//  - ScrapedData == null: backend tự resolve qua adapter API (eBay/Rakuten — Phase sau).
public record ResolveUrlRequest(
    [Required, MaxLength(2000)] string Url,
    Guid? CategoryId = null,
    ExtensionScrapedData? ScrapedData = null
);

// Data sản phẩm extension scrape ra (KHÔNG có Quantity — user chọn ở popup sau).
public record ExtensionScrapedData(
    [Required, MaxLength(20)]  string Platform,
    [Required, MaxLength(200)] string PlatformProductId,
    [Required, MaxLength(100)] string ShopIdOnPlatform,
    [Required, MaxLength(255)] string ShopName,
    [MaxLength(500)]           string? ShopUrl,
    [Required]                 string TitleOriginal,
                               string? TitleTranslated,
    [Required, Range(0.01, 9_999_999)] decimal PriceOriginal,
    [Range(0.01, 9_999_999)]   decimal? PricePromotion,
    [Required, MaxLength(10)]  string Currency,
                               int? Stock,
    [MaxLength(1000)]          string? PrimaryImageUrl,
                               List<string>? ImageUrls,
    [MaxLength(1000)]          string? PropertiesTranslated,
    [MaxLength(1000)]          string? PropertiesOriginal,
    [MaxLength(200)]           string? SelectedSkuId,
                               List<ExtensionPriceTierDto>? PriceTiers,
    [MaxLength(20)]            string? ConfidenceTier
);

// Trả luôn ProductDetailResponse để popup render variant/giá.
public record ResolveUrlResponse(
    string                 PlatformName,
    Guid?                  ProductId,
    string                 Status,        // "Resolved" | "NeedExtension" | "Forbidden" | "Error"
    string?                Reason,
    ProductDetailResponse? Product
);

// ── Response ──────────────────────────────────────────────────────────────────
public record CrawlResultResponse(
    string PlatformName,
    string Keyword,
    int TotalFound,
    int Saved,
    int Skipped,
    int Forbidden,
    List<CrawlItemResult> Items
);

public record CrawlItemResult(
    string PlatformProductId,
    string Title,
    Guid? SavedProductId,        // null nếu skip
    string Status,                 // "Created", "Updated", "Skipped", "Forbidden", "Error"
    string? Reason                  // VD: "Forbidden category: Pin Lithium" hoặc error message
);

// ── Single URL response ───────────────────────────────────────────────────────
public record CrawlUrlResultResponse(
    string PlatformName,
    string PlatformProductId,
    Guid? SavedProductId,
    string Status,
    string? Reason
);