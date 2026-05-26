using LG.Module2.Domain.Exceptions;

namespace LG.Module2.Domain.Entities;

// ── SackStatus ────────────────────────────────────────────────────────────────
public enum SackStatus
{
    Packing   = 1,   // Đang đóng bao
    Sealed    = 2,   // Đã kẹp chì, sẵn sàng vận chuyển
    InTransit = 3,   // Đang vận chuyển
    Arrived   = 4,   // Đã về kho VN
    Opened    = 5,   // Đã rã bao tại kho VN
}

// ── Sack ──────────────────────────────────────────────────────────────────────
public class Sack
{
    public Guid       Id              { get; private set; } = Guid.NewGuid();
    public string     SackCode        { get; private set; } = default!;  // Mã bao nội bộ
    public Guid?      ContainerTripId { get; private set; }
    public SackStatus Status          { get; private set; } = SackStatus.Packing;
    public decimal    TotalWeightKg   { get; private set; }
    public int        TotalPackages   { get; private set; }
    public string?    SealCode        { get; private set; }  // Số chì kẹp
    public DateTime   CreatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime   UpdatedAt       { get; private set; } = DateTime.UtcNow;

    public ICollection<SackPackageMap> PackageMaps { get; private set; } = new List<SackPackageMap>();

    private Sack() { }

    public static Sack Create(string sackCode) =>
        new() { SackCode = sackCode.Trim().ToUpper() };

    public void AddPackage(Package package)
    {
        if (Status != SackStatus.Packing)
            throw new SackSealedException(Id);

        if (package.PackagingType == PackagingType.Fragile &&
            PackageMaps.Any(m => m.RemovedAt == null))
        {
            var hasNonFragile = PackageMaps
                .Where(m => m.RemovedAt == null)
                .Any();
            if (hasNonFragile)
                throw new SackMixedFragileException();
        }

        var map = SackPackageMap.Add(Id, package.Id);
        PackageMaps.Add(map);
        Touch();
    }

    public void Seal(string sealCode)
    {
        if (Status != SackStatus.Packing)
            throw new SackSealedException(Id);

        SealCode      = sealCode.Trim();
        Status        = SackStatus.Sealed;
        TotalPackages = PackageMaps.Count(m => m.RemovedAt == null);
        Touch();
    }

    public void AssignToTrip(Guid tripId)
    {
        ContainerTripId = tripId;
        Status          = SackStatus.InTransit;
        Touch();
    }

    public void MarkArrived()
    {
        Status = SackStatus.Arrived;
        Touch();
    }

    public void Open()
    {
        Status = SackStatus.Opened;
        Touch();
    }

    public void RecalculateWeight(decimal totalKg)
    {
        TotalWeightKg = totalKg;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── SackPackageMap ────────────────────────────────────────────────────────────
public class SackPackageMap
{
    public Guid      Id        { get; private set; } = Guid.NewGuid();
    public Guid      SackId    { get; private set; }
    public Guid      PackageId { get; private set; }
    public DateTime  AddedAt   { get; private set; } = DateTime.UtcNow;
    public DateTime? RemovedAt { get; private set; }  // Null = còn trong bao

    public Sack    Sack    { get; private set; } = default!;
    public Package Package { get; private set; } = default!;

    private SackPackageMap() { }

    public static SackPackageMap Add(Guid sackId, Guid packageId) =>
        new() { SackId = sackId, PackageId = packageId };

    public void Remove() => RemovedAt = DateTime.UtcNow;
}
