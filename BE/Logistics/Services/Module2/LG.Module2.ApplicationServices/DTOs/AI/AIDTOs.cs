using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.AI;

// ── Requests ──────────────────────────────────────────────────────────────────
public record TransitForecastRequest(
    string         OriginProvinceCn,
    decimal        WeightKg,
    string         CarrierCn,
    BorderCrossing BorderCrossing,
    string?        Season = null   // spring/summer/autumn/winter/tet — null = tự suy từ tháng hiện tại
);

public record CreateBorderAlertRequest(
    BorderCrossing AffectedBorder,
    AlertSeverity  Severity,
    int?           EstimatedDelayDays = null,
    string?        Description        = null
);

// ── Responses ─────────────────────────────────────────────────────────────────
public record TransitForecastResponse(
    Guid     Id,
    string   OriginProvinceCn,
    decimal  WeightKg,
    string   CarrierCn,
    string   BorderCrossing,
    string?  Season,
    int      EstDaysMin,
    int      EstDaysMax,
    decimal  ConfidencePct,
    bool     BorderAlertApplied,   // có cảnh báo tắc biên đang active trên cửa khẩu này không
    DateTime ForecastedAt
);

public record BorderAlertResponse(
    Guid      Id,
    string    AffectedBorder,
    string    Severity,
    string    Source,
    int?      EstimatedDelayDays,
    string?   Description,
    int       NotifiedCustomersCount,
    bool      IsActive,
    DateTime  CreatedAt,
    DateTime? ResolvedAt
);

/// Kết quả 1 lần quét dữ liệu nội bộ tìm dấu hiệu tắc biên.
public record CongestionScanResult(
    int BordersScanned,
    int AlertsCreated,
    List<BorderAlertResponse> Alerts
);
