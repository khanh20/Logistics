using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Product;

// ── Response ──────────────────────────────────────────────────────────────────
public record ProductListItemResponse(
    Guid    Id,
    string  Slug,
    string  OriginalTitle,
    string? TranslatedTitle,
    string? PrimaryImageUrl,
    decimal MinPriceCny,
    decimal MaxPriceCny,
    int     VariantCount,
    bool    IsForbidden,
    bool    IsFeatured,
    string  PlatformName,
    string  ShopName
);

public record ProductDetailResponse(
    Guid                          Id,
    string                        Slug,
    string                        OriginalTitle,
    string?                       TranslatedTitle,
    string?                       SeoDescription,
    string                        OriginalUrl,
    bool                          IsForbidden,
    string?                       ForbiddenReason,
    bool                          IsFeatured,
    bool                          IsActive,
    int                           ViewCount,
    DateTime?                     LastPriceSyncedAt,
    CategorySlimResponse          Category,
    ShopSlimResponse              Shop,
    List<ProductVariantResponse>  Variants,
    List<ProductImageResponse>    Images,
    List<ProductAttributeResponse> Attributes,
    DateTime                      CreatedAt
);

public record ProductVariantResponse(
    Guid    Id,
    string  VariantName,
    string? TranslatedName,
    decimal PriceCnyCurrent,
    decimal? PriceCnyMin,
    int?    StockRaw,
    bool    IsAvailable,
    string? ImageUrl,
    List<PriceTierResponse> PriceTiers
);

public record PriceTierResponse(
    int     MinQuantity,
    int?    MaxQuantity,
    decimal PriceCny
);

public record ProductImageResponse(
    Guid    Id,
    string  Url,       // local_cdn_url ?? source_url
    bool    IsPrimary,
    int     SortOrder
);

public record ProductAttributeResponse(
    string? KeyVn,
    string? KeyCn,
    string? ValueVn,
    string? ValueCn
);

public record CategorySlimResponse(Guid Id, string NameVn, string Slug);
public record ShopSlimResponse(Guid Id, string ShopName, string PlatformName, decimal InternalRating);

// ── Request ───────────────────────────────────────────────────────────────────
public record ProductSearchRequest(
    string?  Keyword    = null,
    Guid?    CategoryId = null,
    Guid?    PlatformId = null,
    decimal? MinPriceCny = null,
    decimal? MaxPriceCny = null,
    bool     ActiveOnly  = true,
    int      Page        = 1,
    [Range(1, 100)] int PageSize = 20
);

public record PagedProductResponse(
    List<ProductListItemResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);

public record UpsertProductRequest(
    [Required] Guid   ShopId,
    [Required] Guid   CategoryId,
    [Required] string PlatformProductId,
    [Required] string OriginalTitle,
    [Required] string Slug,
    [Required] string OriginalUrl,
    string?           TranslatedTitle   = null,
    string?           SeoDescription    = null,
    Guid?             CrawlTaskId       = null,
    List<UpsertVariantRequest>  Variants   = default!,
    List<UpsertImageRequest>    Images     = default!,
    List<UpsertAttributeRequest> Attributes = default!
);

public record UpsertVariantRequest(
    [Required]                string  VariantName,
    string?                           TranslatedName,
    [Required, Range(0.01, 999999)]   decimal PriceCny,
    string?                           SkuIdOnPlatform = null,
    int?                              StockRaw        = null,
    string?                           ImageUrl        = null,
    int                               SortOrder       = 0,
    List<UpsertPriceTierRequest>      PriceTiers      = default!
);

public record UpsertPriceTierRequest(
    [Required, Range(1, int.MaxValue)]    int     MinQuantity,
    int?                                          MaxQuantity,
    [Required, Range(0.01, 999999)]       decimal PriceCny
);

public record UpsertImageRequest(
    [Required] string SourceUrl,
    bool              IsPrimary = false,
    int               SortOrder = 0,
    string?           SourceUrlHash = null
);

public record UpsertAttributeRequest(
    string? KeyCn, string? KeyVn,
    string? ValueCn, string? ValueVn,
    int     SortOrder = 0
);

// ── Mappers ───────────────────────────────────────────────────────────────────
public static class ProductMapper
{
    public static ProductListItemResponse ToListItem(ProductMaster p)
    {
        var prices = p.Variants.Where(v => v.IsAvailable).Select(v => v.PriceCnyCurrent).ToList();
        return new(
            p.Id, p.Slug, p.OriginalTitle, p.TranslatedTitle,
            PrimaryImageUrl: p.Images.FirstOrDefault(i => i.IsPrimary)?.LocalCdnUrl
                          ?? p.Images.FirstOrDefault()?.SourceUrl,
            MinPriceCny: prices.Count > 0 ? prices.Min() : 0,
            MaxPriceCny: prices.Count > 0 ? prices.Max() : 0,
            VariantCount: p.Variants.Count,
            p.IsForbidden, p.IsFeatured,
            PlatformName: p.Shop?.Platform?.Name ?? string.Empty,
            ShopName: p.Shop?.ShopName ?? string.Empty
        );
    }

    public static ProductDetailResponse ToDetail(ProductMaster p) => new(
        p.Id, p.Slug, p.OriginalTitle, p.TranslatedTitle, p.SeoDescription, p.OriginalUrl,
        p.IsForbidden, p.ForbiddenCategory?.Reason,
        p.IsFeatured, p.IsActive, p.ViewCount, p.LastPriceSyncedAt,
        Category: new(p.Category.Id, p.Category.NameVn, p.Category.Slug),
        Shop: new(p.Shop.Id, p.Shop.ShopName, p.Shop.Platform?.Name ?? "", p.Shop.InternalRating),
        Variants: p.Variants.Select(ToVariant).ToList(),
        Images: p.Images.Select(ToImage).ToList(),
        Attributes: p.Attributes.Select(ToAttribute).ToList(),
        p.CreatedAt
    );

    public static ProductVariantResponse ToVariant(ProductVariant v) => new(
        v.Id, v.VariantName, v.TranslatedName,
        v.PriceCnyCurrent, v.PriceCnyMin,
        v.StockRaw, v.IsAvailable, v.ImageUrl,
        PriceTiers: v.PriceTiers.Select(t => new PriceTierResponse(t.MinQuantity, t.MaxQuantity, t.PriceCny)).ToList()
    );

    public static ProductImageResponse ToImage(ProductImage i) => new(
        i.Id, i.LocalCdnUrl ?? i.SourceUrl, i.IsPrimary, i.SortOrder);

    public static ProductAttributeResponse ToAttribute(ProductAttribute a) => new(
        a.KeyVn, a.KeyCn, a.ValueVn, a.ValueCn);
}
