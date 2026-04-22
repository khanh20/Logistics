using LG.Module1.Domain.Rules;
using LG.Module1.Domain.Exceptions;

namespace LG.Module1.Domain.Entities;

// ─── ProductMaster ────────────────────────────────────────────────────────────
public class ProductMaster
{
    public Guid    Id                  { get; private set; } = Guid.NewGuid();
    public Guid    ShopId              { get; private set; }
    public Guid    CategoryId          { get; private set; }
    public string  PlatformProductId   { get; private set; } = default!;
    public string  OriginalTitle       { get; private set; } = default!;
    public string? TranslatedTitle     { get; private set; }
    public string  Slug                { get; private set; } = default!;
    public string? SeoDescription      { get; private set; }
    public string  OriginalUrl         { get; private set; } = default!;
    public int     ViewCount           { get; private set; }
    public int     TotalSoldLocal      { get; private set; }
    public bool    IsFeatured          { get; private set; }
    public bool    IsForbidden         { get; private set; }
    public Guid?   ForbiddenCategoryId { get; private set; }
    public bool    IsActive            { get; private set; } = true;
    public DateTime? LastPriceSyncedAt { get; private set; }
    public Guid?   CrawlTaskId         { get; private set; }
    public DateTime CreatedAt          { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt          { get; private set; } = DateTime.UtcNow;

    // Navigation
    public PlatformShop              Shop       { get; private set; } = default!;
    public ProductCategory           Category   { get; private set; } = default!;
    public ForbiddenCategory?        ForbiddenCategory { get; private set; }
    public ICollection<ProductVariant>   Variants   { get; private set; } = new List<ProductVariant>();
    public ICollection<ProductImage>     Images     { get; private set; } = new List<ProductImage>();
    public ICollection<ProductAttribute> Attributes { get; private set; } = new List<ProductAttribute>();

    private ProductMaster() { }

    public static ProductMaster Create(Guid shopId, Guid categoryId,
                                        string platformProductId, string originalTitle,
                                        string slug, string originalUrl,
                                        string? translatedTitle = null,
                                        Guid? crawlTaskId = null) =>
        new()
        {
            ShopId = shopId, CategoryId = categoryId,
            PlatformProductId = platformProductId.Trim(),
            OriginalTitle = originalTitle.Trim(),
            TranslatedTitle = translatedTitle?.Trim(),
            Slug = slug.Trim().ToLowerInvariant(),
            OriginalUrl = originalUrl.Trim(),
            CrawlTaskId = crawlTaskId,
        };

    /// Gán cờ hàng cấm từ kiểm tra ForbiddenCategory.
    public void MarkAsForbidden(Guid forbiddenCategoryId)
    {
        IsForbidden = true;
        ForbiddenCategoryId = forbiddenCategoryId;
        Touch();
    }

    public void ClearForbiddenFlag()
    {
        IsForbidden = false;
        ForbiddenCategoryId = null;
        Touch();
    }

    public void SetTranslation(string translatedTitle, string? seoDescription = null)
    {
        TranslatedTitle = translatedTitle.Trim();
        SeoDescription  = seoDescription?.Trim();
        Touch();
    }

    public void SetFeatured(bool featured) { IsFeatured = featured; Touch(); }
    public void Deactivate()               { IsActive   = false;    Touch(); }
    public void Activate()                 { IsActive   = true;     Touch(); }

    public void RecordPriceSync() { LastPriceSyncedAt = DateTime.UtcNow; Touch(); }

    public void IncrementView() => ViewCount++;

    public void IncrementSoldLocal() { TotalSoldLocal++; Touch(); }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ─── ProductVariant ───────────────────────────────────────────────────────────
public class ProductVariant
{
    public Guid    Id                 { get; private set; } = Guid.NewGuid();
    public Guid    ProductId          { get; private set; }
    public string? SkuIdOnPlatform    { get; private set; }
    public string  VariantName        { get; private set; } = default!;
    public string? TranslatedName     { get; private set; }
    public decimal PriceCnyCurrent    { get; private set; }
    public decimal? PriceCnyMin       { get; private set; }
    public int?    StockRaw           { get; private set; }
    public bool    IsAvailable        { get; private set; } = true;
    public string? ImageUrl           { get; private set; }
    public int     SortOrder          { get; private set; }
    public DateTime CreatedAt         { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt         { get; private set; } = DateTime.UtcNow;

    public ProductMaster                   Product    { get; private set; } = default!;
    public ICollection<ProductPriceTier>   PriceTiers { get; private set; } = new List<ProductPriceTier>();

    private ProductVariant() { }

    public static ProductVariant Create(Guid productId, string variantName, decimal priceCny,
                                         string? skuId = null, string? translatedName = null,
                                         int? stockRaw = null, string? imageUrl = null,
                                         int sortOrder = 0) =>
        new()
        {
            ProductId = productId,
            VariantName = variantName.Trim(),
            TranslatedName = translatedName?.Trim(),
            PriceCnyCurrent = priceCny,
            PriceCnyMin = priceCny,
            SkuIdOnPlatform = skuId?.Trim(),
            StockRaw = stockRaw,
            ImageUrl = imageUrl?.Trim(),
            SortOrder = sortOrder,
        };

    /// Cập nhật giá từ lần sync. Tính PriceCnyMin qua PriceTiers.
    public void UpdatePrice(decimal priceCny, IEnumerable<ProductPriceTier>? tiers = null)
    {
        PriceCnyCurrent = priceCny;
        if (tiers is not null)
        {
            var tiersArr = tiers.ToList();
            PriceCnyMin = tiersArr.Count > 0
                ? tiersArr.Min(t => t.PriceCny)
                : priceCny;
        }
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateStock(int stockRaw, bool isAvailable)
    {
        StockRaw    = stockRaw;
        IsAvailable = isAvailable;
        UpdatedAt   = DateTime.UtcNow;
    }

    public void SetTranslation(string translatedName)
    {
        TranslatedName = translatedName.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    /// Lấy giá tốt nhất cho số lượng cụ thể từ PriceTiers.
    public decimal GetPriceForQuantity(int quantity)
    {
        if (!PriceTiers.Any()) return PriceCnyCurrent;

        var tier = PriceTiers
            .Where(t => t.MinQuantity <= quantity && (t.MaxQuantity == null || t.MaxQuantity >= quantity))
            .OrderByDescending(t => t.MinQuantity)
            .FirstOrDefault();

        return tier?.PriceCny ?? PriceCnyCurrent;
    }
}

// ─── ProductPriceTier ─────────────────────────────────────────────────────────
public class ProductPriceTier
{
    public Guid    Id          { get; private set; } = Guid.NewGuid();
    public Guid    VariantId   { get; private set; }
    public int     MinQuantity { get; private set; }
    public int?    MaxQuantity { get; private set; }
    public decimal PriceCny    { get; private set; }
    public DateTime CreatedAt  { get; private set; } = DateTime.UtcNow;

    public ProductVariant Variant { get; private set; } = default!;

    private ProductPriceTier() { }

    public static ProductPriceTier Create(Guid variantId, int minQty, decimal priceCny,
                                           int? maxQty = null)
    {
        if (minQty < 1) throw new ArgumentException("MinQuantity must be >= 1.");
        if (priceCny <= 0) throw new ArgumentException("PriceCny must be positive.");
        if (maxQty.HasValue && maxQty < minQty)
            throw new ArgumentException("MaxQuantity must be >= MinQuantity.");

        return new() { VariantId = variantId, MinQuantity = minQty, MaxQuantity = maxQty, PriceCny = priceCny };
    }
}

// ─── ProductImage ─────────────────────────────────────────────────────────────
public class ProductImage
{
    public Guid    Id            { get; private set; } = Guid.NewGuid();
    public Guid    ProductId     { get; private set; }
    public string  SourceUrl     { get; private set; } = default!;
    public string? LocalCdnUrl   { get; private set; }
    /// SHA-256 của SourceUrl — phát hiện ảnh trùng.
    public string? SourceUrlHash { get; private set; }
    public bool    IsPrimary     { get; private set; }
    public int     SortOrder     { get; private set; }
    public short?  WidthPx       { get; private set; }
    public short?  HeightPx      { get; private set; }
    public int?    FileSizeKb    { get; private set; }
    public DateTime CreatedAt    { get; private set; } = DateTime.UtcNow;

    public ProductMaster Product { get; private set; } = default!;

    private ProductImage() { }

    public static ProductImage Create(Guid productId, string sourceUrl,
                                       bool isPrimary = false, int sortOrder = 0,
                                       string? sourceUrlHash = null) =>
        new()
        {
            ProductId     = productId,
            SourceUrl     = sourceUrl.Trim(),
            IsPrimary     = isPrimary,
            SortOrder     = sortOrder,
            SourceUrlHash = sourceUrlHash,
        };

    public void SetLocalCdnUrl(string localCdnUrl, short? width = null,
                                short? height = null, int? fileSizeKb = null)
    {
        LocalCdnUrl = localCdnUrl.Trim();
        WidthPx     = width;
        HeightPx    = height;
        FileSizeKb  = fileSizeKb;
    }
}

// ─── ProductAttribute ─────────────────────────────────────────────────────────
public class ProductAttribute
{
    public Guid    Id        { get; private set; } = Guid.NewGuid();
    public Guid    ProductId { get; private set; }
    public string? KeyCn     { get; private set; }
    public string? KeyVn     { get; private set; }
    public string? ValueCn   { get; private set; }
    public string? ValueVn   { get; private set; }
    public int     SortOrder { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;

    public ProductMaster Product { get; private set; } = default!;

    private ProductAttribute() { }

    public static ProductAttribute Create(Guid productId, string? keyCn, string? keyVn,
                                           string? valueCn, string? valueVn, int sortOrder = 0) =>
        new()
        {
            ProductId = productId, KeyCn = keyCn, KeyVn = keyVn,
            ValueCn = valueCn, ValueVn = valueVn, SortOrder = sortOrder,
        };
}
