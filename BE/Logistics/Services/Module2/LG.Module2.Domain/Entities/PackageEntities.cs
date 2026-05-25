using LG.Module2.Domain.Exceptions;

namespace LG.Module2.Domain.Entities;

// ── PackageStatus ─────────────────────────────────────────────────────────────
public enum PackageStatus
{
    PendingCn      = 1,   // Chờ hàng về kho TQ
    InCnWarehouse  = 2,   // Đang ở kho TQ
    InSack         = 3,   // Đã đóng vào bao
    InTransit      = 4,   // Đang vận chuyển quốc tế
    Customs        = 5,   // Đang làm thủ tục hải quan
    InVnWarehouse  = 6,   // Đang ở kho VN
    Dispatched     = 7,   // Đã xuất kho, đang giao nội địa
    Delivered      = 8,   // Giao thành công
    Lost           = 9,   // Thất lạc
    Returned       = 10,  // Trả lại
}

// ── PackagingType ─────────────────────────────────────────────────────────────
public enum PackagingType
{
    Normal    = 1,
    Fragile   = 2,   // Yêu cầu đóng gỗ
    Oversized = 3,
    LiquidRisk = 4,
}

// ── InsuranceLevel ────────────────────────────────────────────────────────────
public enum InsuranceLevel
{
    Basic = 1,   // 50% bồi thường
    Full  = 2,   // 100% bồi thường
}

// ── Package ───────────────────────────────────────────────────────────────────
public class Package
{
    public Guid           Id              { get; private set; } = Guid.NewGuid();
    public string         Barcode         { get; private set; } = default!;  // Mã vạch nội bộ tự sinh
    public Guid?          WaybillId       { get; private set; }  // FK → china_waybills
    public Guid?          SackId          { get; private set; }  // FK → sacks
    public Guid?          ZoneId          { get; private set; }  // FK → warehouse_zones
    public Guid           CustomerId      { get; private set; }
    public Guid           OrderId         { get; private set; }

    public PackageStatus  Status          { get; private set; } = PackageStatus.PendingCn;
    public PackagingType  PackagingType   { get; private set; } = PackagingType.Normal;

    // ── Dimensions ────────────────────────────────────────────────────────────
    public decimal? ActualWeightKg  { get; private set; }
    public decimal? LengthCm        { get; private set; }
    public decimal? WidthCm         { get; private set; }
    public decimal? HeightCm        { get; private set; }

    // Computed — vol = L*W*H/8000, charged = max(actual, vol), min 0.3kg
    public decimal? VolWeightKg     { get; private set; }
    public decimal? ChargedWeightKg { get; private set; }

    // ── Insurance ─────────────────────────────────────────────────────────────
    public bool           InsuranceOpted  { get; private set; } = false;
    public InsuranceLevel? InsuranceLevel { get; private set; }

    public DateTime  CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt { get; private set; } = DateTime.UtcNow;

    public ICollection<PackageItemMap>    Items      { get; private set; } = new List<PackageItemMap>();
    public ICollection<PackageDimension>  Dimensions { get; private set; } = new List<PackageDimension>();
    public ICollection<PackageImage>      Images     { get; private set; } = new List<PackageImage>();

    private Package() { }

    public static Package Create(Guid customerId, Guid orderId, string barcode,
                                  PackagingType packagingType = PackagingType.Normal) =>
        new()
        {
            CustomerId    = customerId,
            OrderId       = orderId,
            Barcode       = barcode.Trim().ToUpper(),
            PackagingType = packagingType,
        };

    public void AssignWaybill(Guid waybillId)
    {
        WaybillId = waybillId;
        Touch();
    }

    public void AssignZone(Guid zoneId)
    {
        ZoneId = zoneId;
        Touch();
    }

    public void AssignSack(Guid sackId)
    {
        SackId = sackId;
        Touch();
    }

    public void RemoveFromSack()
    {
        SackId = null;
        Touch();
    }

    public void RecordMeasurement(decimal actualWeightKg, decimal? lengthCm, decimal? widthCm, decimal? heightCm)
    {
        ActualWeightKg = actualWeightKg;
        LengthCm       = lengthCm;
        WidthCm        = widthCm;
        HeightCm       = heightCm;

        if (lengthCm.HasValue && widthCm.HasValue && heightCm.HasValue)
            VolWeightKg = Math.Round(lengthCm.Value * widthCm.Value * heightCm.Value / 8000m, 3);

        var vol = VolWeightKg ?? 0m;
        ChargedWeightKg = Math.Max(Math.Max(actualWeightKg, vol), 0.3m);

        Touch();
    }

    public void EnableInsurance(InsuranceLevel level)
    {
        InsuranceOpted = true;
        InsuranceLevel = level;
        Touch();
    }

    public void TransitionTo(PackageStatus newStatus)
    {
        if (!IsValidTransition(Status, newStatus))
            throw new InvalidPackageTransitionException(Status.ToString(), newStatus.ToString());
        Status = newStatus;
        Touch();
    }

    private static bool IsValidTransition(PackageStatus from, PackageStatus to) =>
        (from, to) switch
        {
            (PackageStatus.PendingCn,     PackageStatus.InCnWarehouse)  => true,
            (PackageStatus.InCnWarehouse, PackageStatus.InSack)          => true,
            (PackageStatus.InSack,        PackageStatus.InTransit)       => true,
            (PackageStatus.InTransit,     PackageStatus.Customs)         => true,
            (PackageStatus.Customs,       PackageStatus.InVnWarehouse)   => true,
            (PackageStatus.InTransit,     PackageStatus.InVnWarehouse)   => true,
            (PackageStatus.InVnWarehouse, PackageStatus.Dispatched)      => true,
            (PackageStatus.Dispatched,    PackageStatus.Delivered)       => true,
            // Trạng thái ngoại lệ
            (_, PackageStatus.Lost)     => true,
            (_, PackageStatus.Returned) => true,
            _ => false,
        };

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── PackageItemMap ────────────────────────────────────────────────────────────
public class PackageItemMap
{
    public Guid    Id          { get; private set; } = Guid.NewGuid();
    public Guid    PackageId   { get; private set; }
    public Guid    OrderItemId { get; private set; }  // FK → Module1 order item
    public int     Quantity    { get; private set; }

    public Package Package { get; private set; } = default!;

    private PackageItemMap() { }

    public static PackageItemMap Create(Guid packageId, Guid orderItemId, int quantity) =>
        new() { PackageId = packageId, OrderItemId = orderItemId, Quantity = quantity };
}

// ── PackageDimensionSource ────────────────────────────────────────────────────
public enum DimensionSource { ChinaWarehouse = 1, VnWarehouse = 2 }

// ── PackageDimension ──────────────────────────────────────────────────────────
public class PackageDimension
{
    public Guid             Id            { get; private set; } = Guid.NewGuid();
    public Guid             PackageId     { get; private set; }
    public DimensionSource  Source        { get; private set; }
    public decimal          ActualWeightKg { get; private set; }
    public decimal?         LengthCm      { get; private set; }
    public decimal?         WidthCm       { get; private set; }
    public decimal?         HeightCm      { get; private set; }
    public decimal?         VolWeightKg   { get; private set; }
    public Guid             MeasuredBy    { get; private set; }  // staff_id
    public string?          DeviceId      { get; private set; }
    public decimal?         VarianceKg    { get; private set; }  // Chênh lệch so với lần cân trước
    public DateTime         MeasuredAt    { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private PackageDimension() { }

    public static PackageDimension Record(Guid packageId, DimensionSource source,
                                           decimal actualWeightKg, Guid measuredBy,
                                           decimal? lengthCm = null, decimal? widthCm = null,
                                           decimal? heightCm = null, string? deviceId = null,
                                           decimal? varianceKg = null)
    {
        decimal? vol = (lengthCm.HasValue && widthCm.HasValue && heightCm.HasValue)
            ? Math.Round(lengthCm.Value * widthCm.Value * heightCm.Value / 8000m, 3)
            : null;

        return new()
        {
            PackageId      = packageId,
            Source         = source,
            ActualWeightKg = actualWeightKg,
            LengthCm       = lengthCm,
            WidthCm        = widthCm,
            HeightCm       = heightCm,
            VolWeightKg    = vol,
            MeasuredBy     = measuredBy,
            DeviceId       = deviceId,
            VarianceKg     = varianceKg,
        };
    }
}

// ── PackageImageType ──────────────────────────────────────────────────────────
public enum PackageImageType { Receipt = 1, Dispatch = 2, Damage = 3, Inspection = 4 }

// ── PackageImage ──────────────────────────────────────────────────────────────
public class PackageImage
{
    public Guid             Id          { get; private set; } = Guid.NewGuid();
    public Guid             PackageId   { get; private set; }
    public PackageImageType Type        { get; private set; }
    public string           Url         { get; private set; } = default!;
    public Guid?            UploadedBy  { get; private set; }
    public string?          Note        { get; private set; }
    public DateTime         CreatedAt   { get; private set; } = DateTime.UtcNow;

    public Package Package { get; private set; } = default!;

    private PackageImage() { }

    public static PackageImage Upload(Guid packageId, PackageImageType type, string url,
                                       Guid? uploadedBy = null, string? note = null) =>
        new()
        {
            PackageId  = packageId,
            Type       = type,
            Url        = url.Trim(),
            UploadedBy = uploadedBy,
            Note       = note?.Trim(),
        };
}
