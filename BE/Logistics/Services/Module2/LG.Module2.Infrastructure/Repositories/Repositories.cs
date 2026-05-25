using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Repositories;
using LG.Module2.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace LG.Module2.Infrastructure.Repositories;

// ── UnitOfWork ────────────────────────────────────────────────────────────────
public class Module2UnitOfWork(Module2DbContext db) : IModule2UnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try   { await action(ct); await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default)
    {
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await action(ct);
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return result;
            }
            catch { await tx.RollbackAsync(ct); throw; }
        });
    }
}

// ── Warehouse ─────────────────────────────────────────────────────────────────
public class WarehouseRepository(Module2DbContext db) : IWarehouseRepository
{
    public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Warehouses.Include(x => x.Zones).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<Warehouse>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.Warehouses.Where(x => x.IsActive).ToListAsync(ct);

    public Task<List<Warehouse>> GetByTypeAsync(WarehouseType type, CancellationToken ct = default) =>
        db.Warehouses.Where(x => x.Type == type && x.IsActive).ToListAsync(ct);

    public async Task AddAsync(Warehouse warehouse, CancellationToken ct = default) =>
        await db.Warehouses.AddAsync(warehouse, ct);

    public Task UpdateAsync(Warehouse warehouse, CancellationToken ct = default)
    {
        db.Warehouses.Update(warehouse);
        return Task.CompletedTask;
    }
}

public class WarehouseZoneRepository(Module2DbContext db) : IWarehouseZoneRepository
{
    public Task<WarehouseZone?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.WarehouseZones.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<WarehouseZone>> GetByWarehouseAsync(Guid warehouseId, CancellationToken ct = default) =>
        db.WarehouseZones.Where(x => x.WarehouseId == warehouseId && x.IsActive).ToListAsync(ct);

    public async Task AddAsync(WarehouseZone zone, CancellationToken ct = default) =>
        await db.WarehouseZones.AddAsync(zone, ct);
}

public class WarehouseStaffRepository(Module2DbContext db) : IWarehouseStaffRepository
{
    public Task<WarehouseStaff?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.WarehouseStaffs.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<WarehouseStaff>> GetByWarehouseAsync(Guid warehouseId, CancellationToken ct = default) =>
        db.WarehouseStaffs.Where(x => x.WarehouseId == warehouseId && x.IsActive).ToListAsync(ct);

    public Task<WarehouseStaff?> GetByStaffAndWarehouseAsync(Guid staffId, Guid warehouseId, CancellationToken ct = default) =>
        db.WarehouseStaffs.FirstOrDefaultAsync(x => x.StaffId == staffId && x.WarehouseId == warehouseId, ct);

    public async Task AddAsync(WarehouseStaff staff, CancellationToken ct = default) =>
        await db.WarehouseStaffs.AddAsync(staff, ct);

    public Task UpdateAsync(WarehouseStaff staff, CancellationToken ct = default)
    {
        db.WarehouseStaffs.Update(staff);
        return Task.CompletedTask;
    }
}

// ── Package ───────────────────────────────────────────────────────────────────
public class PackageRepository(Module2DbContext db) : IPackageRepository
{
    public Task<Package?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Packages
          .Include(x => x.Items)
          .Include(x => x.Images)
          .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Package?> GetByBarcodeAsync(string barcode, CancellationToken ct = default) =>
        db.Packages.FirstOrDefaultAsync(x => x.Barcode == barcode.ToUpper(), ct);

    public Task<List<Package>> GetByOrderAsync(Guid orderId, CancellationToken ct = default) =>
        db.Packages.Where(x => x.OrderId == orderId).ToListAsync(ct);

    public Task<List<Package>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.Packages.Where(x => x.CustomerId == customerId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public Task<List<Package>> GetBySackAsync(Guid sackId, CancellationToken ct = default) =>
        db.Packages.Where(x => x.SackId == sackId).ToListAsync(ct);

    public Task<List<Package>> GetByStatusAsync(PackageStatus status, CancellationToken ct = default) =>
        db.Packages.Where(x => x.Status == status).ToListAsync(ct);

    public Task<bool> BarcodeExistsAsync(string barcode, CancellationToken ct = default) =>
        db.Packages.AnyAsync(x => x.Barcode == barcode.ToUpper(), ct);

    public async Task AddAsync(Package package, CancellationToken ct = default) =>
        await db.Packages.AddAsync(package, ct);

    public Task UpdateAsync(Package package, CancellationToken ct = default)
    {
        db.Packages.Update(package);
        return Task.CompletedTask;
    }
}

// ── ChinaWaybill ──────────────────────────────────────────────────────────────
public class ChinaWaybillRepository(Module2DbContext db) : IChinaWaybillRepository
{
    public Task<ChinaWaybill?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ChinaWaybills.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ChinaWaybill?> GetByWaybillNoAsync(string waybillNo, CancellationToken ct = default) =>
        db.ChinaWaybills.FirstOrDefaultAsync(x => x.WaybillNo == waybillNo, ct);

    public Task<List<ChinaWaybill>> GetByOrderAsync(Guid orderId, CancellationToken ct = default) =>
        db.ChinaWaybills.Where(x => x.OrderId == orderId).ToListAsync(ct);

    public async Task AddAsync(ChinaWaybill waybill, CancellationToken ct = default) =>
        await db.ChinaWaybills.AddAsync(waybill, ct);

    public Task UpdateAsync(ChinaWaybill waybill, CancellationToken ct = default)
    {
        db.ChinaWaybills.Update(waybill);
        return Task.CompletedTask;
    }
}

// ── Sack ──────────────────────────────────────────────────────────────────────
public class SackRepository(Module2DbContext db) : ISackRepository
{
    public Task<Sack?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.Sacks.Include(x => x.PackageMaps).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<Sack?> GetBySackCodeAsync(string sackCode, CancellationToken ct = default) =>
        db.Sacks.FirstOrDefaultAsync(x => x.SackCode == sackCode.ToUpper(), ct);

    public Task<List<Sack>> GetByTripAsync(Guid containerTripId, CancellationToken ct = default) =>
        db.Sacks.Where(x => x.ContainerTripId == containerTripId).ToListAsync(ct);

    public Task<List<Sack>> GetByStatusAsync(SackStatus status, CancellationToken ct = default) =>
        db.Sacks.Where(x => x.Status == status).ToListAsync(ct);

    public async Task AddAsync(Sack sack, CancellationToken ct = default) =>
        await db.Sacks.AddAsync(sack, ct);

    public Task UpdateAsync(Sack sack, CancellationToken ct = default)
    {
        db.Sacks.Update(sack);
        return Task.CompletedTask;
    }
}

// ── ContainerTrip ─────────────────────────────────────────────────────────────
public class ContainerTripRepository(Module2DbContext db) : IContainerTripRepository
{
    public Task<ContainerTrip?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.ContainerTrips.Include(x => x.Sacks).FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<ContainerTrip?> GetByTripCodeAsync(string tripCode, CancellationToken ct = default) =>
        db.ContainerTrips.FirstOrDefaultAsync(x => x.TripCode == tripCode.ToUpper(), ct);

    public Task<List<ContainerTrip>> GetByStatusAsync(ContainerTripStatus status, CancellationToken ct = default) =>
        db.ContainerTrips.Where(x => x.Status == status).ToListAsync(ct);

    public async Task AddAsync(ContainerTrip trip, CancellationToken ct = default) =>
        await db.ContainerTrips.AddAsync(trip, ct);

    public Task UpdateAsync(ContainerTrip trip, CancellationToken ct = default)
    {
        db.ContainerTrips.Update(trip);
        return Task.CompletedTask;
    }
}

// ── CustomsClearance ──────────────────────────────────────────────────────────
public class CustomsClearanceRepository(Module2DbContext db) : ICustomsClearanceRepository
{
    public Task<CustomsClearance?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.CustomsClearances.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<CustomsClearance?> GetByTripAsync(Guid containerTripId, CancellationToken ct = default) =>
        db.CustomsClearances.FirstOrDefaultAsync(x => x.ContainerTripId == containerTripId, ct);

    public Task<List<CustomsClearance>> GetByStatusAsync(CustomsClearanceStatus status, CancellationToken ct = default) =>
        db.CustomsClearances.Where(x => x.Status == status).ToListAsync(ct);

    public async Task AddAsync(CustomsClearance clearance, CancellationToken ct = default) =>
        await db.CustomsClearances.AddAsync(clearance, ct);

    public Task UpdateAsync(CustomsClearance clearance, CancellationToken ct = default)
    {
        db.CustomsClearances.Update(clearance);
        return Task.CompletedTask;
    }
}

// ── Tracking ──────────────────────────────────────────────────────────────────
public class TrackingEventRepository(Module2DbContext db) : ITrackingEventRepository
{
    public Task<List<TrackingEvent>> GetByPackageAsync(Guid packageId, CancellationToken ct = default) =>
        db.TrackingEvents.Where(x => x.PackageId == packageId).OrderBy(x => x.OccuredAt).ToListAsync(ct);

    public async Task AddAsync(TrackingEvent evt, CancellationToken ct = default) =>
        await db.TrackingEvents.AddAsync(evt, ct);
}

public class WarehouseReceiptRepository(Module2DbContext db) : IWarehouseReceiptRepository
{
    public Task<WarehouseReceipt?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.WarehouseReceipts.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<WarehouseReceipt>> GetByPackageAsync(Guid packageId, CancellationToken ct = default) =>
        db.WarehouseReceipts.Where(x => x.PackageId == packageId).OrderByDescending(x => x.ReceivedAt).ToListAsync(ct);

    public async Task AddAsync(WarehouseReceipt receipt, CancellationToken ct = default) =>
        await db.WarehouseReceipts.AddAsync(receipt, ct);
}

public class WarehouseDispatchRepository(Module2DbContext db) : IWarehouseDispatchRepository
{
    public Task<WarehouseDispatch?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.WarehouseDispatches.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<WarehouseDispatch>> GetByPackageAsync(Guid packageId, CancellationToken ct = default) =>
        db.WarehouseDispatches.Where(x => x.PackageId == packageId).OrderByDescending(x => x.DispatchedAt).ToListAsync(ct);

    public async Task AddAsync(WarehouseDispatch dispatch, CancellationToken ct = default) =>
        await db.WarehouseDispatches.AddAsync(dispatch, ct);
}

// ── Delivery ──────────────────────────────────────────────────────────────────
public class DeliveryRequestRepository(Module2DbContext db) : IDeliveryRequestRepository
{
    public Task<DeliveryRequest?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.DeliveryRequests.Include(x => x.Packages).Include(x => x.Waybills)
          .FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<DeliveryRequest>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.DeliveryRequests.Where(x => x.CustomerId == customerId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public Task<List<DeliveryRequest>> GetByStatusAsync(DeliveryRequestStatus status, CancellationToken ct = default) =>
        db.DeliveryRequests.Where(x => x.Status == status).ToListAsync(ct);

    public async Task AddAsync(DeliveryRequest request, CancellationToken ct = default) =>
        await db.DeliveryRequests.AddAsync(request, ct);

    public Task UpdateAsync(DeliveryRequest request, CancellationToken ct = default)
    {
        db.DeliveryRequests.Update(request);
        return Task.CompletedTask;
    }
}

public class DomesticCarrierRepository(Module2DbContext db) : IDomesticCarrierRepository
{
    public Task<DomesticCarrier?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.DomesticCarriers.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<DomesticCarrier>> GetAllActiveAsync(CancellationToken ct = default) =>
        db.DomesticCarriers.Where(x => x.IsActive).ToListAsync(ct);

    public async Task AddAsync(DomesticCarrier carrier, CancellationToken ct = default) =>
        await db.DomesticCarriers.AddAsync(carrier, ct);

    public Task UpdateAsync(DomesticCarrier carrier, CancellationToken ct = default)
    {
        db.DomesticCarriers.Update(carrier);
        return Task.CompletedTask;
    }
}

public class DomesticWaybillRepository(Module2DbContext db) : IDomesticWaybillRepository
{
    public Task<DomesticWaybill?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.DomesticWaybills.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<DomesticWaybill?> GetByTrackingNoAsync(string trackingNo, CancellationToken ct = default) =>
        db.DomesticWaybills.FirstOrDefaultAsync(x => x.TrackingNo == trackingNo, ct);

    public Task<List<DomesticWaybill>> GetByDeliveryRequestAsync(Guid deliveryRequestId, CancellationToken ct = default) =>
        db.DomesticWaybills.Where(x => x.DeliveryRequestId == deliveryRequestId).ToListAsync(ct);

    public async Task AddAsync(DomesticWaybill waybill, CancellationToken ct = default) =>
        await db.DomesticWaybills.AddAsync(waybill, ct);

    public Task UpdateAsync(DomesticWaybill waybill, CancellationToken ct = default)
    {
        db.DomesticWaybills.Update(waybill);
        return Task.CompletedTask;
    }
}

// ── Claims ────────────────────────────────────────────────────────────────────
public class MissingClaimRepository(Module2DbContext db) : IMissingClaimRepository
{
    public Task<MissingClaim?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.MissingClaims.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<MissingClaim>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.MissingClaims.Where(x => x.CustomerId == customerId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public Task<List<MissingClaim>> GetByStatusAsync(MissingClaimStatus status, CancellationToken ct = default) =>
        db.MissingClaims.Where(x => x.Status == status).ToListAsync(ct);

    public async Task AddAsync(MissingClaim claim, CancellationToken ct = default) =>
        await db.MissingClaims.AddAsync(claim, ct);

    public Task UpdateAsync(MissingClaim claim, CancellationToken ct = default)
    {
        db.MissingClaims.Update(claim);
        return Task.CompletedTask;
    }
}

public class InsuranceClaimRepository(Module2DbContext db) : IInsuranceClaimRepository
{
    public Task<InsuranceClaim?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        db.InsuranceClaims.FirstOrDefaultAsync(x => x.Id == id, ct);

    public Task<List<InsuranceClaim>> GetByPackageAsync(Guid packageId, CancellationToken ct = default) =>
        db.InsuranceClaims.Where(x => x.PackageId == packageId).ToListAsync(ct);

    public async Task AddAsync(InsuranceClaim claim, CancellationToken ct = default) =>
        await db.InsuranceClaims.AddAsync(claim, ct);

    public Task UpdateAsync(InsuranceClaim claim, CancellationToken ct = default)
    {
        db.InsuranceClaims.Update(claim);
        return Task.CompletedTask;
    }
}

public class StoragePenaltyRepository(Module2DbContext db) : IStoragePenaltyRepository
{
    public Task<List<StoragePenalty>> GetUnchargedAsync(CancellationToken ct = default) =>
        db.StoragePenalties.Where(x => !x.IsCharged && x.TotalFeeVnd > 0).ToListAsync(ct);

    public Task<List<StoragePenalty>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default) =>
        db.StoragePenalties.Where(x => x.CustomerId == customerId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task AddAsync(StoragePenalty penalty, CancellationToken ct = default) =>
        await db.StoragePenalties.AddAsync(penalty, ct);

    public Task UpdateAsync(StoragePenalty penalty, CancellationToken ct = default)
    {
        db.StoragePenalties.Update(penalty);
        return Task.CompletedTask;
    }
}
