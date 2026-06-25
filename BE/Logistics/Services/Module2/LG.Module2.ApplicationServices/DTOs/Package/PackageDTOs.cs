using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Package;

// ── Responses ─────────────────────────────────────────────────────────────────
public record PackageSummaryResponse(
    Guid    Id,
    string  Barcode,
    string  Status,
    string  PackagingType,
    Guid    CustomerId,
    Guid    OrderId,
    decimal? ActualWeightKg,
    decimal? ChargedWeightKg,
    bool    InsuranceOpted,
    string? InsuranceLevel,
    DateTime CreatedAt
);

public record PackageDetailResponse(
    Guid    Id,
    string  Barcode,
    string  Status,
    string  PackagingType,
    Guid    CustomerId,
    Guid    OrderId,
    Guid?   WaybillId,
    Guid?   SackId,
    Guid?   ZoneId,
    string? ZoneCode,
    decimal? ActualWeightKg,
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    decimal? VolWeightKg,
    decimal? ChargedWeightKg,
    bool    InsuranceOpted,
    string? InsuranceLevel,
    List<TrackingEventResponse> TrackingHistory,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TrackingEventResponse(
    Guid     Id,
    string   Type,
    string   TypeLabel,
    string?  Location,
    string?  Note,
    DateTime OccuredAt
);

public record PackageImageResponse(
    Guid    Id,
    string  Type,
    string  Url,
    string? Note,
    DateTime CreatedAt
);

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreatePackageRequest(
    Guid   CustomerId,
    Guid   OrderId,
    PackagingType PackagingType = PackagingType.Normal,
    bool   InsuranceOpted = false,
    InsuranceLevel? InsuranceLevel = null
);

public record UploadPackageImageRequest(
    Guid   PackageId,
    PackageImageType Type,
    string Url,
    string? Note
);

// ── Fee (UC-2.07) ─────────────────────────────────────────────────────────────
public record CalculateFeeRequest(
    decimal  RatePerKgVnd,
    decimal? InsuranceRate    = null,   // VD: 0.02 = 2% giá trị khai báo
    decimal? DeclaredValueVnd = null
);

public record PackageFeeResponse(
    Guid     PackageId,
    string   Barcode,
    string   Status,
    decimal? ChargedWeightKg,
    decimal? RatePerKgVnd,
    decimal? ShipIntlVnd,
    bool     InsuranceOpted,
    decimal? InsuranceFeeVnd,
    decimal? TotalFeeVnd,
    DateTime? CalculatedAt
);
