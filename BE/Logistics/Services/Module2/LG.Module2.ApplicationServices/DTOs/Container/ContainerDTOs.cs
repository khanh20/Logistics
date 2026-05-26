using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Container;

// ── Responses ─────────────────────────────────────────────────────────────────
public record TripSummaryResponse(
    Guid    Id,
    string  TripCode,
    string  Status,
    string  BorderCrossing,
    string? VehiclePlate,
    string? DriverPhone,
    int     TotalSacks,
    DateTime? DepartureCnAt,
    DateTime? EtaVnAt,
    DateTime? ArrivedVnAt,
    DateTime  CreatedAt
);

public record TripDetailResponse(
    Guid    Id,
    string  TripCode,
    string  Status,
    string  BorderCrossing,
    string? VehiclePlate,
    string? DriverPhone,
    DateTime? DepartureCnAt,
    DateTime? EtaVnAt,
    DateTime? ArrivedVnAt,
    List<TripSackItemResponse> Sacks,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record TripSackItemResponse(
    Guid    SackId,
    string  SackCode,
    string  SackStatus,
    decimal TotalWeightKg,
    int     TotalPackages,
    string? SealCode
);

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreateTripRequest(
    string          TripCode,
    BorderCrossing  BorderCrossing,
    string?         VehiclePlate = null,
    string?         DriverPhone  = null,
    DateTime?       EtaVnAt      = null
);

public record AssignSacksRequest(List<string> SackCodes);

public record DepartTripRequest(DateTime DepartureAt);

public record ArriveVietnamRequest(DateTime ArrivedAt);
