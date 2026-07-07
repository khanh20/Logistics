using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Claim;

// ── MissingClaim ──────────────────────────────────────────────────────────────
public record CreateMissingClaimRequest(
    Guid         PackageId,
    string       Description,
    List<string>? EvidenceUrls    = null,
    decimal?     ClaimedValueVnd  = null
);

public record InvestigateClaimRequest(string? StaffNote = null);

public record ResolveMissingClaimRequest(
    MissingClaimResolution Resolution,
    decimal? ClaimedValueVnd = null,   // staff điều chỉnh giá trị nếu cần
    string?  StaffNote       = null
);

public record RejectClaimRequest(string Reason);

public record MissingClaimResponse(
    Guid     Id,
    Guid     PackageId,
    string   Barcode,
    Guid     CustomerId,
    string   Status,
    string?  Description,
    List<string> EvidenceUrls,
    decimal? ClaimedValueVnd,
    decimal? InsuranceCoveragePct,
    decimal? ResolvedAmountVnd,
    string?  Resolution,
    string?  StaffNote,
    Guid?    InsuranceClaimId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

// ── InsuranceClaim ────────────────────────────────────────────────────────────
public record CreateInsuranceClaimRequest(
    Guid          PackageId,
    decimal       ClaimedAmountVnd,
    string        Description,
    List<string>? DamagePhotos    = null,
    Guid?         MissingClaimId  = null
);

public record UpdateInsuranceClaimRequest(
    InsuranceClaimStatus Status,           // Approved / Rejected / UnderReview
    decimal? ApprovedAmountVnd = null,
    string?  Notes             = null
);

public record InsuranceClaimResponse(
    Guid     Id,
    Guid     PackageId,
    string   Barcode,
    Guid     OrderId,
    Guid?    MissingClaimId,
    string   Status,
    List<string> DamagePhotos,
    decimal? ApprovedAmount,
    string?  AdjusterNote,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
