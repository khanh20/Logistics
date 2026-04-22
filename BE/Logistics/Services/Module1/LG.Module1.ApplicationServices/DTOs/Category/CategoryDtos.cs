using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Category;

public record CategoryTreeResponse(
    Guid   Id,
    string NameVn,
    string? NameCn,
    string Slug,
    string? IconUrl,
    int    SortOrder,
    List<CategoryTreeResponse> Children
);

public record CreateCategoryRequest(
    [Required, MaxLength(255)] string  NameVn,
    [MaxLength(255)]           string? NameCn,
    [Required, MaxLength(255)] string  Slug,
    Guid?                             ParentId = null,
    [MaxLength(500)]           string? IconUrl  = null,
    int                               SortOrder = 0
);

public record UpdateCategoryRequest(
    [Required, MaxLength(255)] string  NameVn,
    [MaxLength(255)]           string? NameCn,
    [Required, MaxLength(255)] string  Slug,
    int                               SortOrder = 0,
    bool                              IsActive  = true
);

public record ForbiddenCategoryResponse(
    Guid   Id,
    string Name,
    string? KeywordsCn,
    string? KeywordsVn,
    string Reason,
    string Severity,
    bool   IsActive
);

public record CreateForbiddenCategoryRequest(
    [Required, MaxLength(255)] string Name,
    [Required]                 string Reason,
    string?                          KeywordsCn = null,
    string?                          KeywordsVn = null,
    string                           Severity   = "Block"
);

public record ExchangeRateResponse(
    Guid    Id,
    decimal RateVndPerCny,
    string  Source,
    bool    IsCurrent,
    DateTime EffectiveFrom
);

public record UpdateExchangeRateRequest(
    [Required, Range(100, 99999)] decimal RateVndPerCny,
    [Required, MaxLength(100)]    string  Source
);

public record DepositConfigResponse(
    Guid   Id,
    string Name,
    decimal DepositPct,
    string AppliesTo,
    bool   IsActive
);

public static class LookupMapper
{
    public static CategoryTreeResponse ToCategoryTree(ProductCategory c) => new(
        c.Id, c.NameVn, c.NameCn, c.Slug, c.IconUrl, c.SortOrder,
        c.Children.Select(ToCategoryTree).ToList()
    );

    public static ForbiddenCategoryResponse ToForbiddenResponse(ForbiddenCategory f) => new(
        f.Id, f.Name, f.KeywordsCn, f.KeywordsVn, f.Reason, f.Severity.ToString(), f.IsActive
    );

    public static ExchangeRateResponse ToRateResponse(ExchangeRateHistory r) => new(
        r.Id, r.RateVndPerCny, r.Source, r.IsCurrent, r.EffectiveFrom
    );

    public static DepositConfigResponse ToDepositResponse(DepositConfig d) => new(
        d.Id, d.Name, d.DepositPct, d.AppliesTo.ToString(), d.IsActive
    );
}
