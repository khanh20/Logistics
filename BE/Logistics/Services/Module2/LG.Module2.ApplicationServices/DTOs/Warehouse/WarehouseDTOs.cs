using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.DTOs.Warehouse;

// ── Responses ─────────────────────────────────────────────────────────────────
public record WarehouseResponse(
    Guid   Id,
    string Name,
    string Type,
    string Country,
    string City,
    string? Address,
    decimal? MaxCapacityM3,
    bool   IsActive
);

public record WarehouseZoneResponse(
    Guid   Id,
    Guid   WarehouseId,
    string Code,
    string? Description,
    bool   IsActive
);

public record WarehouseReceiptResponse(
    Guid     Id,
    Guid     PackageId,
    string   Barcode,
    Guid     WarehouseId,
    string   WarehouseName,
    Guid     ScannedBy,
    string   Condition,
    string?  Note,
    DateTime ReceivedAt
);

// ── UC-2.01: Nhập kho TQ — Request ───────────────────────────────────────────
public record CnWarehouseReceiveRequest(
    string  Barcode,          // Mã vạch trên kiện (quét scanner)
    string? WaybillNo,        // Mã vận đơn TQ nội địa (xác nhận)
    decimal ActualWeightKg,
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    ReceiptCondition Condition,
    string?  Note,
    string?  DeviceId         // Thiết bị cân
);

// ── UC-2.06: Nhập kho VN — Request ───────────────────────────────────────────
public record VnWarehouseReceiveRequest(
    string  Barcode,
    string  ZoneCode,         // Vị trí trong kho (VD: "A-3-2")
    decimal? ActualWeightKg,  // Cân lại lần 2 để đối soát
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    ReceiptCondition Condition,
    string?  Note,
    string?  DeviceId
);

// Kết quả sau khi scan nhập kho — trả về cho client hiển thị nhanh
public record ReceiveScanResult(
    Guid    PackageId,
    string  Barcode,
    string  Status,
    string  CustomerName,   // Hiển thị trên màn hình scanner
    string  OrderCode,
    decimal? ChargedWeightKg,
    bool    WeightVarianceAlert,
    decimal? VariancePct,
    string  Condition,
    DateTime ReceivedAt
);
