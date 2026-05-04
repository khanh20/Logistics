using LG.Module1.Domain.Entities;

namespace LG.Module1.Domain.Adapters;

/// Kết quả thô trả về từ một adapter sau khi search/fetch từ sàn.
/// Mỗi adapter (eBay, Rakuten, AliExpress...) phải normalize response API gốc
/// về DTO này trước khi đưa cho ProductIngestionService.
public record RawProductResult(
    string PlatformProductId,         // ID gốc trên sàn (ví dụ: eBay itemId, Rakuten itemCode)
    string Title,                     // Tên gốc, không dịch
    decimal PriceOriginal,             // Giá gốc theo currency của sàn
    string CurrencyCode,              // "USD", "JPY", "CNY", "EUR"...
    string ProductUrl,                // URL chi tiết sản phẩm
    List<string> ImageUrls,           // Tối thiểu 1 ảnh (image[0] sẽ là primary)
    string ShopIdOnPlatform,          // ID shop trên sàn
    string ShopName,
    string? ShopUrl = null,
    string? CategoryNameOriginal = null,   // Category name gốc — chưa map sang ProductCategory nội bộ
    decimal? Rating = null,   // 0-5
    int? ReviewCount = null,
    int? SoldCount = null,
    bool? ShipsInternationally = null,
    string? Description = null,
    List<RawVariantResult>? Variants = null   // Có thể null nếu sàn không trả variant ngay từ search
);

public record RawVariantResult(
    string? SkuIdOnPlatform,
    string VariantName,         // VD: "Black / 256GB"
    decimal PriceOriginal,
    int? StockRaw,
    string? ImageUrl,
    List<RawPriceTier>? PriceTiers = null  // 1688 mới có tier, eBay/Rakuten thường null
);

public record RawPriceTier(int MinQuantity, int? MaxQuantity, decimal PriceOriginal);

// ─────────────────────────────────────────────────────────────────────────────
/// Một adapter biết cách giao tiếp với 1 sàn cụ thể.
/// ProductIngestionService inject tất cả adapter qua DI và route theo PlatformName.
public interface IPlatformAdapter
{
    /// Tên platform — phải khớp với Platform.Name trong DB (VD: "eBay", "Rakuten").
    string PlatformName { get; }

    /// API provider tương ứng — để service biết enum mapping.
    ApiProvider Provider { get; }

    /// Search sản phẩm theo keyword. Trả về tối đa pageSize kết quả.
    Task<List<RawProductResult>> SearchAsync(
        string keyword, int page, int pageSize, CancellationToken ct = default);

    /// Lấy chi tiết 1 sản phẩm cụ thể theo ID gốc trên sàn.
    Task<RawProductResult?> GetDetailAsync(
        string platformProductId, CancellationToken ct = default);

    /// Trích PlatformProductId từ URL gốc của sàn.
    /// VD: "https://www.ebay.com/itm/123456789" → "v1|123456789|0"
    /// VD: "https://item.rakuten.co.jp/shop1/item-abc/" → "shop1:item-abc"
    /// Trả null nếu URL không hợp lệ với sàn này.
    string? ExtractIdFromUrl(string url);
}