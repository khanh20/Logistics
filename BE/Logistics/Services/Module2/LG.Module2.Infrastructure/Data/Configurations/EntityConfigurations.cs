using LG.Module2.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LG.Module2.Infrastructure.Data.Configurations;

// ── Warehouse ─────────────────────────────────────────────────────────────────
public class WarehouseConfig : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> b)
    {
        b.ToTable("warehouses");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(255).IsRequired();
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Country).HasMaxLength(10).IsRequired();
        b.Property(x => x.City).HasMaxLength(100).IsRequired();
        b.Property(x => x.Address).HasMaxLength(500);
        b.Property(x => x.MaxCapacityM3).HasPrecision(10, 2);

        b.HasMany(x => x.Zones).WithOne(x => x.Warehouse)
         .HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
        b.HasMany(x => x.Staff).WithOne(x => x.Warehouse)
         .HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);

        // Seed kho mặc định
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("A0000000-0000-0000-0000-000000000001"), Name = "Kho Quảng Châu", Type = WarehouseType.ChinaTransit, Country = "CN", City = "Guangzhou", IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("A0000000-0000-0000-0000-000000000002"), Name = "Kho Lạng Sơn",  Type = WarehouseType.VnHub,        Country = "VN", City = "Lạng Sơn",  IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("A0000000-0000-0000-0000-000000000003"), Name = "Kho Hà Nội",    Type = WarehouseType.VnHub,        Country = "VN", City = "Hà Nội",    IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("A0000000-0000-0000-0000-000000000004"), Name = "Kho HCM",       Type = WarehouseType.VnHub,        Country = "VN", City = "HCM",       IsActive = true, CreatedAt = now }
        );
    }
}

public class WarehouseZoneConfig : IEntityTypeConfiguration<WarehouseZone>
{
    public void Configure(EntityTypeBuilder<WarehouseZone> b)
    {
        b.ToTable("warehouse_zones");
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).HasMaxLength(50).IsRequired();
        b.Property(x => x.Description).HasMaxLength(255);
        b.HasIndex(x => new { x.WarehouseId, x.Code }).IsUnique();
    }
}

public class WarehouseStaffConfig : IEntityTypeConfiguration<WarehouseStaff>
{
    public void Configure(EntityTypeBuilder<WarehouseStaff> b)
    {
        b.ToTable("warehouse_staff");
        b.HasKey(x => x.Id);
        b.Property(x => x.StaffName).HasMaxLength(255).IsRequired();
        b.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        b.HasIndex(x => new { x.WarehouseId, x.StaffId }).IsUnique();
    }
}

// ── Package ───────────────────────────────────────────────────────────────────
public class PackageConfig : IEntityTypeConfiguration<Package>
{
    public void Configure(EntityTypeBuilder<Package> b)
    {
        b.ToTable("packages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Barcode).HasMaxLength(30).IsRequired();
        b.HasIndex(x => x.Barcode).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.PackagingType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.InsuranceLevel).HasConversion<string>().HasMaxLength(10);

        b.Property(x => x.ActualWeightKg).HasPrecision(8, 3);
        b.Property(x => x.LengthCm).HasPrecision(8, 1);
        b.Property(x => x.WidthCm).HasPrecision(8, 1);
        b.Property(x => x.HeightCm).HasPrecision(8, 1);
        b.Property(x => x.VolWeightKg).HasPrecision(8, 3);
        b.Property(x => x.ChargedWeightKg).HasPrecision(8, 3);

        b.HasIndex(x => x.CustomerId);
        b.HasIndex(x => x.OrderId);
        b.HasIndex(x => x.Status);

        b.HasMany(x => x.Items).WithOne(x => x.Package)
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Dimensions).WithOne(x => x.Package)
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Images).WithOne(x => x.Package)
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PackageItemMapConfig : IEntityTypeConfiguration<PackageItemMap>
{
    public void Configure(EntityTypeBuilder<PackageItemMap> b)
    {
        b.ToTable("package_item_maps");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.PackageId, x.OrderItemId });
    }
}

public class PackageDimensionConfig : IEntityTypeConfiguration<PackageDimension>
{
    public void Configure(EntityTypeBuilder<PackageDimension> b)
    {
        b.ToTable("package_dimensions");
        b.HasKey(x => x.Id);
        b.Property(x => x.Source).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ActualWeightKg).HasPrecision(8, 3);
        b.Property(x => x.LengthCm).HasPrecision(8, 1);
        b.Property(x => x.WidthCm).HasPrecision(8, 1);
        b.Property(x => x.HeightCm).HasPrecision(8, 1);
        b.Property(x => x.VolWeightKg).HasPrecision(8, 3);
        b.Property(x => x.VarianceKg).HasPrecision(8, 3);
        b.Property(x => x.DeviceId).HasMaxLength(100);
    }
}

public class PackageImageConfig : IEntityTypeConfiguration<PackageImage>
{
    public void Configure(EntityTypeBuilder<PackageImage> b)
    {
        b.ToTable("package_images");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Url).HasMaxLength(1000).IsRequired();
        b.Property(x => x.Note).HasMaxLength(500);
    }
}

// ── Sack ──────────────────────────────────────────────────────────────────────
public class SackConfig : IEntityTypeConfiguration<Sack>
{
    public void Configure(EntityTypeBuilder<Sack> b)
    {
        b.ToTable("sacks");
        b.HasKey(x => x.Id);
        b.Property(x => x.SackCode).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.SackCode).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.SealCode).HasMaxLength(100);
        b.Property(x => x.TotalWeightKg).HasPrecision(10, 3);

        b.HasMany(x => x.PackageMaps).WithOne(x => x.Sack)
         .HasForeignKey(x => x.SackId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class SackPackageMapConfig : IEntityTypeConfiguration<SackPackageMap>
{
    public void Configure(EntityTypeBuilder<SackPackageMap> b)
    {
        b.ToTable("sack_package_maps");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.SackId, x.PackageId });
    }
}

// ── Transit ───────────────────────────────────────────────────────────────────
public class ChinaWaybillConfig : IEntityTypeConfiguration<ChinaWaybill>
{
    public void Configure(EntityTypeBuilder<ChinaWaybill> b)
    {
        b.ToTable("china_waybills");
        b.HasKey(x => x.Id);
        b.Property(x => x.WaybillNo).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.WaybillNo).IsUnique();
        b.Property(x => x.CarrierCn).HasMaxLength(100).IsRequired();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
    }
}

public class ContainerTripConfig : IEntityTypeConfiguration<ContainerTrip>
{
    public void Configure(EntityTypeBuilder<ContainerTrip> b)
    {
        b.ToTable("container_trips");
        b.HasKey(x => x.Id);
        b.Property(x => x.TripCode).HasMaxLength(50).IsRequired();
        b.HasIndex(x => x.TripCode).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.BorderCrossing).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.VehiclePlate).HasMaxLength(20);
        b.Property(x => x.DriverPhone).HasMaxLength(20);

        b.HasMany(x => x.Sacks).WithOne()
         .HasForeignKey(x => x.ContainerTripId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
    }
}

public class CustomsClearanceConfig : IEntityTypeConfiguration<CustomsClearance>
{
    public void Configure(EntityTypeBuilder<CustomsClearance> b)
    {
        b.ToTable("customs_clearances");
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ClearanceType).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.DeclaredValueVnd).HasPrecision(16, 0);
        b.Property(x => x.DutyPaidVnd).HasPrecision(16, 0);
        b.Property(x => x.HsCodeSummary).HasMaxLength(500);
        b.Property(x => x.CustomsOfficerName).HasMaxLength(255);
        b.Property(x => x.HeldReason).HasMaxLength(1000);

        b.HasOne(x => x.ContainerTrip).WithMany()
         .HasForeignKey(x => x.ContainerTripId).OnDelete(DeleteBehavior.Restrict);
    }
}

// ── Tracking ──────────────────────────────────────────────────────────────────
public class TrackingEventConfig : IEntityTypeConfiguration<TrackingEvent>
{
    public void Configure(EntityTypeBuilder<TrackingEvent> b)
    {
        b.ToTable("tracking_events");
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Location).HasMaxLength(255);
        b.Property(x => x.Note).HasMaxLength(1000);
        b.HasIndex(x => new { x.PackageId, x.OccuredAt });

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class WarehouseReceiptConfig : IEntityTypeConfiguration<WarehouseReceipt>
{
    public void Configure(EntityTypeBuilder<WarehouseReceipt> b)
    {
        b.ToTable("warehouse_receipts");
        b.HasKey(x => x.Id);
        b.Property(x => x.Condition).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Note).HasMaxLength(1000);

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Warehouse).WithMany()
         .HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class WarehouseDispatchConfig : IEntityTypeConfiguration<WarehouseDispatch>
{
    public void Configure(EntityTypeBuilder<WarehouseDispatch> b)
    {
        b.ToTable("warehouse_dispatches");
        b.HasKey(x => x.Id);
        b.Property(x => x.Reason).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.Note).HasMaxLength(1000);

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Warehouse).WithMany()
         .HasForeignKey(x => x.WarehouseId).OnDelete(DeleteBehavior.Restrict);
    }
}

// ── Delivery ──────────────────────────────────────────────────────────────────
public class DeliveryRequestConfig : IEntityTypeConfiguration<DeliveryRequest>
{
    public void Configure(EntityTypeBuilder<DeliveryRequest> b)
    {
        b.ToTable("delivery_requests");
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.PreferredTimeSlot).HasMaxLength(100);
        b.Property(x => x.CodAmount).HasPrecision(14, 0);
        b.Property(x => x.ShipFeeVnd).HasPrecision(14, 0);
        b.HasIndex(x => x.CustomerId);

        b.HasMany(x => x.Packages).WithOne(x => x.DeliveryRequest)
         .HasForeignKey(x => x.DeliveryRequestId).OnDelete(DeleteBehavior.Cascade);
        b.HasMany(x => x.Waybills).WithOne(x => x.DeliveryRequest)
         .HasForeignKey(x => x.DeliveryRequestId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DeliveryPackageConfig : IEntityTypeConfiguration<DeliveryPackage>
{
    public void Configure(EntityTypeBuilder<DeliveryPackage> b)
    {
        b.ToTable("delivery_packages");
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.DeliveryRequestId, x.PackageId }).IsUnique();

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class DomesticCarrierConfig : IEntityTypeConfiguration<DomesticCarrier>
{
    public void Configure(EntityTypeBuilder<DomesticCarrier> b)
    {
        b.ToTable("domestic_carriers");
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.Name).IsUnique();
        b.Property(x => x.ApiEndpoint).HasMaxLength(500).IsRequired();
        b.Property(x => x.WebhookSecret).HasMaxLength(255);
        b.Property(x => x.MaxWeightKg).HasPrecision(8, 3);
        b.Property(x => x.MaxValueVnd).HasPrecision(14, 0);

        // Seed carriers
        var now = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        b.HasData(
            new { Id = Guid.Parse("B0000000-0000-0000-0000-000000000001"), Name = "GHTK",         ApiEndpoint = "https://services.giaohangtietkiem.vn", MaxWeightKg = 30m, MaxValueVnd = 20_000_000m, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("B0000000-0000-0000-0000-000000000002"), Name = "GHN",          ApiEndpoint = "https://online-gateway.ghn.vn",         MaxWeightKg = 30m, MaxValueVnd = 20_000_000m, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("B0000000-0000-0000-0000-000000000003"), Name = "Viettel Post", ApiEndpoint = "https://partner.viettelpost.vn",        MaxWeightKg = 50m, MaxValueVnd = 50_000_000m, IsActive = true, CreatedAt = now },
            new { Id = Guid.Parse("B0000000-0000-0000-0000-000000000004"), Name = "J&T Express",  ApiEndpoint = "https://api.jtexpress.vn",              MaxWeightKg = 50m, MaxValueVnd = 30_000_000m, IsActive = true, CreatedAt = now }
        );
    }
}

public class DomesticWaybillConfig : IEntityTypeConfiguration<DomesticWaybill>
{
    public void Configure(EntityTypeBuilder<DomesticWaybill> b)
    {
        b.ToTable("domestic_waybills");
        b.HasKey(x => x.Id);
        b.Property(x => x.TrackingNo).HasMaxLength(100).IsRequired();
        b.HasIndex(x => x.TrackingNo).IsUnique();
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        b.Property(x => x.CarrierFeeVnd).HasPrecision(14, 0);
        b.Property(x => x.FailedReason).HasMaxLength(500);

        b.HasOne(x => x.Carrier).WithMany()
         .HasForeignKey(x => x.CarrierId).OnDelete(DeleteBehavior.Restrict);
    }
}

// ── Claims ────────────────────────────────────────────────────────────────────
public class SplitMergeHistoryConfig : IEntityTypeConfiguration<SplitMergeHistory>
{
    public void Configure(EntityTypeBuilder<SplitMergeHistory> b)
    {
        b.ToTable("split_merge_histories");
        b.HasKey(x => x.Id);
        b.Property(x => x.Action).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.ChildPackageIds).HasColumnType("text");
        b.Property(x => x.Reason).HasMaxLength(500);
    }
}

public class MissingClaimConfig : IEntityTypeConfiguration<MissingClaim>
{
    public void Configure(EntityTypeBuilder<MissingClaim> b)
    {
        b.ToTable("missing_claims");
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Resolution).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.ClaimedValueVnd).HasPrecision(14, 0);
        b.Property(x => x.InsuranceCoveragePct).HasPrecision(4, 2);
        b.Property(x => x.ResolvedAmountVnd).HasPrecision(14, 0);
        b.Property(x => x.StaffNote).HasMaxLength(1000);
        b.HasIndex(x => x.CustomerId);

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class InsuranceClaimConfig : IEntityTypeConfiguration<InsuranceClaim>
{
    public void Configure(EntityTypeBuilder<InsuranceClaim> b)
    {
        b.ToTable("insurance_claims");
        b.HasKey(x => x.Id);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.DamagePhotos).HasColumnType("text");
        b.Property(x => x.AdjusterNote).HasMaxLength(1000);
        b.Property(x => x.ApprovedAmount).HasPrecision(14, 0);

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class StoragePenaltyConfig : IEntityTypeConfiguration<StoragePenalty>
{
    public void Configure(EntityTypeBuilder<StoragePenalty> b)
    {
        b.ToTable("storage_penalties");
        b.HasKey(x => x.Id);
        b.Property(x => x.DailyRateVnd).HasPrecision(10, 0);
        b.Property(x => x.TotalFeeVnd).HasPrecision(14, 0);
        b.HasIndex(x => new { x.CustomerId, x.IsCharged });

        b.HasOne(x => x.Package).WithMany()
         .HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
    }
}

// ── AI ────────────────────────────────────────────────────────────────────────
public class AITransitForecastConfig : IEntityTypeConfiguration<AITransitForecast>
{
    public void Configure(EntityTypeBuilder<AITransitForecast> b)
    {
        b.ToTable("ai_transit_forecasts");
        b.HasKey(x => x.Id);
        b.Property(x => x.OriginProvinceCn).HasMaxLength(100).IsRequired();
        b.Property(x => x.CarrierCn).HasMaxLength(100).IsRequired();
        b.Property(x => x.BorderCrossing).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Season).HasMaxLength(20);
        b.Property(x => x.WeightKg).HasPrecision(8, 3);
        b.Property(x => x.ConfidencePct).HasPrecision(4, 2);
        b.HasIndex(x => new { x.OriginProvinceCn, x.BorderCrossing });
    }
}

public class AIBorderAlertConfig : IEntityTypeConfiguration<AIBorderAlert>
{
    public void Configure(EntityTypeBuilder<AIBorderAlert> b)
    {
        b.ToTable("ai_border_alerts");
        b.HasKey(x => x.Id);
        b.Property(x => x.AffectedBorder).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Severity).HasConversion<string>().HasMaxLength(10);
        b.Property(x => x.Source).HasConversion<string>().HasMaxLength(20);
        b.Property(x => x.Description).HasMaxLength(1000);
        b.HasIndex(x => new { x.AffectedBorder, x.IsActive });
    }
}
