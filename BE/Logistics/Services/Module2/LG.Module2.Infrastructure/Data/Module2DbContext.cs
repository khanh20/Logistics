using LG.Module2.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace LG.Module2.Infrastructure.Data;

public class Module2DbContext(DbContextOptions<Module2DbContext> options) : DbContext(options)
{
    // ── Warehouse ─────────────────────────────────────────────────────────────
    public DbSet<Warehouse>      Warehouses      => Set<Warehouse>();
    public DbSet<WarehouseZone>  WarehouseZones  => Set<WarehouseZone>();
    public DbSet<WarehouseStaff> WarehouseStaffs => Set<WarehouseStaff>();

    // ── Package ───────────────────────────────────────────────────────────────
    public DbSet<Package>           Packages           => Set<Package>();
    public DbSet<PackageItemMap>    PackageItemMaps    => Set<PackageItemMap>();
    public DbSet<PackageDimension>  PackageDimensions  => Set<PackageDimension>();
    public DbSet<PackageImage>      PackageImages      => Set<PackageImage>();

    // ── Sack ──────────────────────────────────────────────────────────────────
    public DbSet<Sack>           Sacks           => Set<Sack>();
    public DbSet<SackPackageMap> SackPackageMaps => Set<SackPackageMap>();

    // ── Transit ───────────────────────────────────────────────────────────────
    public DbSet<ChinaWaybill>       ChinaWaybills       => Set<ChinaWaybill>();
    public DbSet<ContainerTrip>      ContainerTrips      => Set<ContainerTrip>();
    public DbSet<CustomsClearance>   CustomsClearances   => Set<CustomsClearance>();

    // ── Tracking ──────────────────────────────────────────────────────────────
    public DbSet<TrackingEvent>      TrackingEvents      => Set<TrackingEvent>();
    public DbSet<WarehouseReceipt>   WarehouseReceipts   => Set<WarehouseReceipt>();
    public DbSet<WarehouseDispatch>  WarehouseDispatches => Set<WarehouseDispatch>();

    // ── Delivery ──────────────────────────────────────────────────────────────
    public DbSet<DeliveryRequest>  DeliveryRequests  => Set<DeliveryRequest>();
    public DbSet<DeliveryPackage>  DeliveryPackages  => Set<DeliveryPackage>();
    public DbSet<DomesticCarrier>  DomesticCarriers  => Set<DomesticCarrier>();
    public DbSet<DomesticWaybill>  DomesticWaybills  => Set<DomesticWaybill>();

    // ── Claims ────────────────────────────────────────────────────────────────
    public DbSet<SplitMergeHistory> SplitMergeHistories => Set<SplitMergeHistory>();
    public DbSet<MissingClaim>      MissingClaims       => Set<MissingClaim>();
    public DbSet<InsuranceClaim>    InsuranceClaims     => Set<InsuranceClaim>();
    public DbSet<StoragePenalty>    StoragePenalties    => Set<StoragePenalty>();

    // ── AI ────────────────────────────────────────────────────────────────────
    public DbSet<AITransitForecast> AITransitForecasts => Set<AITransitForecast>();
    public DbSet<AIBorderAlert>     AIBorderAlerts     => Set<AIBorderAlert>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.HasDefaultSchema("mod2");
        mb.ApplyConfigurationsFromAssembly(typeof(Module2DbContext).Assembly);

        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v == null ? null : v.Value.Kind == DateTimeKind.Utc ? v : v.Value.ToUniversalTime(),
            v => v == null ? null : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc));

        foreach (var entity in mb.Model.GetEntityTypes())
        foreach (var prop in entity.GetProperties())
        {
            if (prop.ClrType == typeof(DateTime))  prop.SetValueConverter(utcConverter);
            if (prop.ClrType == typeof(DateTime?)) prop.SetValueConverter(utcNullConverter);
        }
    }
}
