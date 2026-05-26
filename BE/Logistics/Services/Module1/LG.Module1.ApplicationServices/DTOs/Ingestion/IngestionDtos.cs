using System.ComponentModel.DataAnnotations;

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