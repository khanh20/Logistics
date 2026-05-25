namespace LG.Module2.Domain.Entities;

// ── WarehouseType ─────────────────────────────────────────────────────────────
public enum WarehouseType
{
    ChinaTransit = 1,   // Kho trung chuyển tại TQ (Quảng Châu)
    VnHub        = 2,   // Kho trung tâm tại VN (Hà Nội, HCM)
    VnLastMile   = 3,   // Kho giao hàng chặng cuối
}

// ── WarehouseStaffRole ────────────────────────────────────────────────────────
public enum WarehouseStaffRole
{
    Receiver   = 1,   // NV nhận hàng / quét mã vạch đầu vào
    Packer     = 2,   // NV đóng gói / đóng bao
    Dispatcher = 3,   // NV xuất kho
    Manager    = 4,   // Quản lý kho
}

// ── Warehouse ─────────────────────────────────────────────────────────────────
public class Warehouse
{
    public Guid          Id              { get; private set; } = Guid.NewGuid();
    public string        Name            { get; private set; } = default!;
    public WarehouseType Type            { get; private set; }
    public string        Country         { get; private set; } = default!;
    public string        City            { get; private set; } = default!;
    public string?       Address         { get; private set; }
    public decimal?      MaxCapacityM3   { get; private set; }
    public bool          IsActive        { get; private set; } = true;
    public DateTime      CreatedAt       { get; private set; } = DateTime.UtcNow;

    public ICollection<WarehouseZone>  Zones { get; private set; } = new List<WarehouseZone>();
    public ICollection<WarehouseStaff> Staff { get; private set; } = new List<WarehouseStaff>();

    private Warehouse() { }

    public static Warehouse Create(string name, WarehouseType type, string country, string city,
                                    string? address = null, decimal? maxCapacityM3 = null) =>
        new()
        {
            Name           = name.Trim(),
            Type           = type,
            Country        = country.Trim(),
            City           = city.Trim(),
            Address        = address?.Trim(),
            MaxCapacityM3  = maxCapacityM3,
        };

    public void Deactivate() => IsActive = false;
}

// ── WarehouseZone ─────────────────────────────────────────────────────────────
public class WarehouseZone
{
    public Guid    Id          { get; private set; } = Guid.NewGuid();
    public Guid    WarehouseId { get; private set; }
    public string  Code        { get; private set; } = default!;  // VD: "A-3-2" (Khu A, Kệ 3, Hàng 2)
    public string? Description { get; private set; }
    public bool    IsActive    { get; private set; } = true;

    public Warehouse Warehouse { get; private set; } = default!;

    private WarehouseZone() { }

    public static WarehouseZone Create(Guid warehouseId, string code, string? description = null) =>
        new()
        {
            WarehouseId = warehouseId,
            Code        = code.Trim().ToUpper(),
            Description = description?.Trim(),
        };
}

// ── WarehouseStaff ────────────────────────────────────────────────────────────
public class WarehouseStaff
{
    public Guid               Id          { get; private set; } = Guid.NewGuid();
    public Guid               WarehouseId { get; private set; }
    public Guid               StaffId     { get; private set; }  // FK → Auth service user
    public string             StaffName   { get; private set; } = default!;  // Denormalized
    public WarehouseStaffRole Role        { get; private set; }
    public bool               IsActive    { get; private set; } = true;
    public DateTime           AssignedAt  { get; private set; } = DateTime.UtcNow;

    public Warehouse Warehouse { get; private set; } = default!;

    private WarehouseStaff() { }

    public static WarehouseStaff Assign(Guid warehouseId, Guid staffId, string staffName,
                                         WarehouseStaffRole role) =>
        new()
        {
            WarehouseId = warehouseId,
            StaffId     = staffId,
            StaffName   = staffName.Trim(),
            Role        = role,
        };

    public void Deactivate() => IsActive = false;
}
