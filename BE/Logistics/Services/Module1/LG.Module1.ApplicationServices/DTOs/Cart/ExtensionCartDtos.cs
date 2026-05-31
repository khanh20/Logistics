using System.ComponentModel.DataAnnotations;

namespace LG.Module1.ApplicationServices.DTOs.Cart;

// Payload từ Chrome Extension gửi lên — raw scraped data từ trang sàn.
// Backend tự convert currency, lookup/upsert Platform/Shop/Product/Variant, rồi add vào Cart.
public record AddFromExtensionRequest(
    [Required, MaxLength(20)]  string Platform,              // "TAOBAO" | "TMALL" | "1688" | "RAKUTEN"
    [Required, MaxLength(200)] string PlatformProductId,
    [Required, MaxLength(100)] string ShopIdOnPlatform,
    [Required, MaxLength(255)] string ShopName,
    [MaxLength(500)]           string? ShopUrl,
    [Required]                 string TitleOriginal,
                               string? TitleTranslated,
    [Required, Range(0.01, 9_999_999)] decimal PriceOriginal,
    [Range(0.01, 9_999_999)]   decimal? PricePromotion,
    [Required, MaxLength(10)]  string Currency,              // "CNY" | "JPY"
    [Range(1, 9999)]           int Quantity,
                               int? Stock,
    [MaxLength(1000)]          string? PrimaryImageUrl,
                               List<string>? ImageUrls,
    [MaxLength(1000)]          string? PropertiesTranslated,
    [MaxLength(1000)]          string? PropertiesOriginal,
    [MaxLength(200)]           string? SelectedSkuId,
                               List<ExtensionPriceTierDto>? PriceTiers,
                               Guid? CategoryId,
    [Required, MaxLength(2000)] string OriginalUrl,
                               string? CustomerNote,
    [MaxLength(20)]            string? ExtensionVersion,
    [Required]                 string ScrapedAt,             // ISO-8601, để client-side track latency
    [MaxLength(20)]            string? ConfidenceTier        // "high" | "medium" | "low" — chỉ Rakuten quan tâm
);

public record ExtensionPriceTierDto(
    [Range(1, int.MaxValue)] int MinQuantity,
                              int? MaxQuantity,
    [Range(0.01, 9_999_999)] decimal PriceOriginal           // theo Currency của request
);

public record AddFromExtensionResponse(
    Guid    CartItemId,
    Guid    ProductId,
    Guid    VariantId,
    string  ProductTitle,
    decimal PriceCnySnapshot,
    int     Quantity,
    int     CartTotalItemCount,
    decimal CartSubtotalCny,
    string  Status                                            // "Added" | "MergedQuantity"
);
