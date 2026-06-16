namespace LG.Module2.Domain.Entities;

// ── TrackingEventType ─────────────────────────────────────────────────────────
public enum TrackingEventType
{
    CnWarehouseIn   = 1,   // Nhập kho TQ
    CnWarehouseOut  = 2,   // Xuất kho TQ
    BorderCustoms   = 3,   // Qua cửa khẩu / hải quan
    VnWarehouseIn   = 4,   // Nhập kho VN
    OutForDelivery  = 5,   // Đang giao nội địa
    Delivered       = 6,   // Giao thành công
    DeliveryFailed  = 7,   // Giao thất bại
    Exception       = 8,   // Sự cố (thất lạc, hư hỏng)
}

// ── TrackingEvent ─────────────────────────────────────────────────────────────
public class TrackingEvent
{
    public Guid              Id        { get; private set; } = Guid.NewGuid();
    public Guid              PackageId { get; private set; }
    public TrackingEventType Type      { get; private set; }
    public string?           Location  { get; private set; }
    public string?           Note      { get; private set; }
    public DateTime          OccuredAt { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private TrackingEvent() { }

    public static TrackingEvent Record(Guid packageId, TrackingEventType type,
                                        string? location = null, string? note = null) =>
        new()
        {
            PackageId = packageId,
            Type      = type,
            Location  = location?.Trim(),
            Note      = note?.Trim(),
        };
}

// ── ReceiptCondition ──────────────────────────────────────────────────────────
public enum ReceiptCondition { Ok = 1, Damaged = 2, Missing = 3 }

// ── WarehouseReceipt ──────────────────────────────────────────────────────────
public class WarehouseReceipt
{
    public Guid             Id          { get; private set; } = Guid.NewGuid();
    public Guid             PackageId   { get; private set; }
    public Guid             WarehouseId { get; private set; }
    public Guid             ScannedBy   { get; private set; }  // staff_id
    public ReceiptCondition Condition   { get; private set; } = ReceiptCondition.Ok;
    public string?          Note        { get; private set; }
    public DateTime         ReceivedAt  { get; private set; } = DateTime.UtcNow;

    public Package   Package   { get; private set; } = default!;
    public Warehouse Warehouse { get; private set; } = default!;

    private WarehouseReceipt() { }

    public static WarehouseReceipt Create(Guid packageId, Guid warehouseId, Guid scannedBy,
                                           ReceiptCondition condition = ReceiptCondition.Ok,
                                           string? note = null) =>
        new()
        {
            PackageId   = packageId,
            WarehouseId = warehouseId,
            ScannedBy   = scannedBy,
            Condition   = condition,
            Note        = note?.Trim(),
        };
}

// ── DispatchReason ────────────────────────────────────────────────────────────
public enum DispatchReason
{
    CustomerRequest = 1,
    ReturnCn        = 2,
    Transfer        = 3,
}

// ── WarehouseDispatch ─────────────────────────────────────────────────────────
public class WarehouseDispatch
{
    public Guid           Id           { get; private set; } = Guid.NewGuid();
    public Guid           PackageId    { get; private set; }
    public Guid           WarehouseId  { get; private set; }
    public Guid           DispatchedBy { get; private set; }  // staff_id
    public DispatchReason Reason       { get; private set; }
    public string?        Note         { get; private set; }
    public DateTime       DispatchedAt { get; private set; } = DateTime.UtcNow;

    public Package   Package   { get; private set; } = default!;
    public Warehouse Warehouse { get; private set; } = default!;

    private WarehouseDispatch() { }

    public static WarehouseDispatch Create(Guid packageId, Guid warehouseId, Guid dispatchedBy,
                                            DispatchReason reason, string? note = null) =>
        new()
        {
            PackageId    = packageId,
            WarehouseId  = warehouseId,
            DispatchedBy = dispatchedBy,
            Reason       = reason,
            Note         = note?.Trim(),
        };
}
