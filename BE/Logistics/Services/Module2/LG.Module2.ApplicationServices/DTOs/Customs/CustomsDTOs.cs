using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Customs;

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreateCustomsClearanceRequest(
    Guid          ContainerTripId,
    ClearanceType ClearanceType,
    decimal?      DeclaredValueVnd = null,
    string?       HsCodeSummary    = null
);

public record UpdateCustomsClearanceRequest(
    CustomsClearanceStatus Status,
    string?  HeldReason         = null,
    string?  CustomsOfficerName = null,
    decimal? DutyPaidVnd        = null
);

// ── Response ──────────────────────────────────────────────────────────────────
public record CustomsClearanceResponse(
    Guid     Id,
    Guid     ContainerTripId,
    string?  TripCode,
    string   Status,
    string   ClearanceType,
    decimal? DeclaredValueVnd,
    string?  HsCodeSummary,
    string?  CustomsOfficerName,
    decimal? DutyPaidVnd,
    string?  HeldReason,
    int      AffectedPackages,
    DateTime? ClearedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
