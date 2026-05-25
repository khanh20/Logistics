using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Sack;

// ── Responses ─────────────────────────────────────────────────────────────────
public record SackSummaryResponse(
    Guid    Id,
    string  SackCode,
    string  Status,
    decimal TotalWeightKg,
    int     TotalPackages,
    string? SealCode,
    Guid?   ContainerTripId,
    DateTime CreatedAt
);

public record SackDetailResponse(
    Guid    Id,
    string  SackCode,
    string  Status,
    decimal TotalWeightKg,
    int     TotalPackages,
    string? SealCode,
    Guid?   ContainerTripId,
    List<SackPackageItemResponse> Packages,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record SackPackageItemResponse(
    Guid    PackageId,
    string  Barcode,
    string  PackageStatus,
    string  PackagingType,
    decimal? ChargedWeightKg,
    DateTime AddedAt
);

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreateSackRequest(string? SackCode = null);   // null = auto-generate

public record AddPackageToSackRequest(string Barcode);

public record SealSackRequest(string SealCode);
