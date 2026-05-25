namespace LG.Module2.Domain.Entities;

// ── ChinaWaybillStatus ────────────────────────────────────────────────────────
public enum ChinaWaybillStatus
{
    Pending    = 1,   // Chờ shop giao cho carrier TQ
    Shipped    = 2,   // Đã ship nội địa TQ
    Arrived    = 3,   // Đã về kho TQ của hệ thống
    Cancelled  = 4,
}

// ── ChinaWaybill ──────────────────────────────────────────────────────────────
public class ChinaWaybill
{
    public Guid                Id                 { get; private set; } = Guid.NewGuid();
    public string              WaybillNo          { get; private set; } = default!;  // Mã vận đơn do shop cung cấp
    public string              CarrierCn          { get; private set; } = default!;  // SF Express, ZTO, YTO...
    public ChinaWaybillStatus  Status             { get; private set; } = ChinaWaybillStatus.Pending;
    public Guid?               OrderId            { get; private set; }  // FK → Module1 CustomerOrder
    public DateTime?           ExpectedCnArrival  { get; private set; }
    public DateTime            CreatedAt          { get; private set; } = DateTime.UtcNow;
    public DateTime            UpdatedAt          { get; private set; } = DateTime.UtcNow;

    private ChinaWaybill() { }

    public static ChinaWaybill Create(string waybillNo, string carrierCn, Guid? orderId = null,
                                       DateTime? expectedArrival = null) =>
        new()
        {
            WaybillNo         = waybillNo.Trim(),
            CarrierCn         = carrierCn.Trim(),
            OrderId           = orderId,
            ExpectedCnArrival = expectedArrival,
        };

    public void MarkArrived()
    {
        Status    = ChinaWaybillStatus.Arrived;
        UpdatedAt = DateTime.UtcNow;
    }
}

// ── ContainerTripStatus ───────────────────────────────────────────────────────
public enum ContainerTripStatus
{
    Loading   = 1,   // Đang xếp hàng
    Departed  = 2,   // Đã xuất phát
    Border    = 3,   // Đang qua cửa khẩu
    ArrivedVn = 4,   // Đã về kho VN
}

// ── BorderCrossing ────────────────────────────────────────────────────────────
public enum BorderCrossing
{
    HuuNghi   = 1,   // Hữu Nghị (Lạng Sơn)
    LaoCai    = 2,
    MongCai   = 3,
}

// ── ContainerTrip ─────────────────────────────────────────────────────────────
public class ContainerTrip
{
    public Guid                Id              { get; private set; } = Guid.NewGuid();
    public string              TripCode        { get; private set; } = default!;
    public ContainerTripStatus Status          { get; private set; } = ContainerTripStatus.Loading;
    public string?             VehiclePlate    { get; private set; }
    public string?             DriverPhone     { get; private set; }
    public BorderCrossing      BorderCrossing  { get; private set; }
    public DateTime?           DepartureCnAt   { get; private set; }
    public DateTime?           EtaVnAt         { get; private set; }
    public DateTime?           ArrivedVnAt     { get; private set; }
    public DateTime            CreatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime            UpdatedAt       { get; private set; } = DateTime.UtcNow;

    public ICollection<Sack> Sacks { get; private set; } = new List<Sack>();

    private ContainerTrip() { }

    public static ContainerTrip Create(string tripCode, BorderCrossing borderCrossing,
                                        string? vehiclePlate = null, string? driverPhone = null,
                                        DateTime? etaVn = null) =>
        new()
        {
            TripCode       = tripCode.Trim().ToUpper(),
            BorderCrossing = borderCrossing,
            VehiclePlate   = vehiclePlate?.Trim(),
            DriverPhone    = driverPhone?.Trim(),
            EtaVnAt        = etaVn,
        };

    public void Depart(DateTime departureAt)
    {
        Status        = ContainerTripStatus.Departed;
        DepartureCnAt = departureAt;
        UpdatedAt     = DateTime.UtcNow;
    }

    public void ReachBorder()
    {
        Status    = ContainerTripStatus.Border;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ArriveVietnam(DateTime arrivedAt)
    {
        Status      = ContainerTripStatus.ArrivedVn;
        ArrivedVnAt = arrivedAt;
        UpdatedAt   = DateTime.UtcNow;
    }
}

// ── CustomsClearanceStatus ────────────────────────────────────────────────────
public enum CustomsClearanceStatus
{
    Pending    = 1,
    Processing = 2,
    Cleared    = 3,
    Held       = 4,   // Bị giữ hàng
}

// ── ClearanceType ─────────────────────────────────────────────────────────────
public enum ClearanceType
{
    Tmdt        = 1,   // Thương mại điện tử (hàng nhỏ)
    TieuNgach   = 2,   // Tiểu ngạch
    ChinhNgach  = 3,   // Chính ngạch
}

// ── CustomsClearance ──────────────────────────────────────────────────────────
public class CustomsClearance
{
    public Guid                    Id                   { get; private set; } = Guid.NewGuid();
    public Guid                    ContainerTripId      { get; private set; }
    public CustomsClearanceStatus  Status               { get; private set; } = CustomsClearanceStatus.Pending;
    public ClearanceType           ClearanceType        { get; private set; }
    public decimal?                DeclaredValueVnd     { get; private set; }
    public string?                 HsCodeSummary        { get; private set; }
    public string?                 CustomsOfficerName   { get; private set; }
    public decimal?                DutyPaidVnd          { get; private set; }
    public string?                 HeldReason           { get; private set; }
    public DateTime?               ClearedAt            { get; private set; }
    public DateTime                CreatedAt            { get; private set; } = DateTime.UtcNow;
    public DateTime                UpdatedAt            { get; private set; } = DateTime.UtcNow;

    public ContainerTrip ContainerTrip { get; private set; } = default!;

    private CustomsClearance() { }

    public static CustomsClearance Create(Guid containerTripId, ClearanceType clearanceType,
                                           decimal? declaredValueVnd = null) =>
        new()
        {
            ContainerTripId  = containerTripId,
            ClearanceType    = clearanceType,
            DeclaredValueVnd = declaredValueVnd,
        };

    public void UpdateStatus(CustomsClearanceStatus newStatus, string? heldReason = null,
                              string? officerName = null, decimal? dutyPaid = null)
    {
        Status              = newStatus;
        HeldReason          = heldReason;
        CustomsOfficerName  = officerName ?? CustomsOfficerName;
        DutyPaidVnd         = dutyPaid ?? DutyPaidVnd;

        if (newStatus == CustomsClearanceStatus.Cleared)
            ClearedAt = DateTime.UtcNow;

        UpdatedAt = DateTime.UtcNow;
    }
}
