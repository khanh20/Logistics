using LG.Module2.Domain.Entities;

namespace LG.Module2.Domain.Repositories;

// ── UnitOfWork ────────────────────────────────────────────────────────────────
public interface IModule2UnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> action, CancellationToken ct = default);
    Task<T> ExecuteInTransactionAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken ct = default);
}

// ── Warehouse ─────────────────────────────────────────────────────────────────
public interface IWarehouseRepository
{
    Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<Warehouse>> GetAllActiveAsync(CancellationToken ct = default);
    Task<List<Warehouse>> GetByTypeAsync(WarehouseType type, CancellationToken ct = default);
    Task AddAsync(Warehouse warehouse, CancellationToken ct = default);
    Task UpdateAsync(Warehouse warehouse, CancellationToken ct = default);
}

public interface IWarehouseZoneRepository
{
    Task<WarehouseZone?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WarehouseZone>> GetByWarehouseAsync(Guid warehouseId, CancellationToken ct = default);
    Task AddAsync(WarehouseZone zone, CancellationToken ct = default);
}

public interface IWarehouseStaffRepository
{
    Task<WarehouseStaff?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WarehouseStaff>> GetByWarehouseAsync(Guid warehouseId, CancellationToken ct = default);
    Task<WarehouseStaff?> GetByStaffAndWarehouseAsync(Guid staffId, Guid warehouseId, CancellationToken ct = default);
    Task AddAsync(WarehouseStaff staff, CancellationToken ct = default);
    Task UpdateAsync(WarehouseStaff staff, CancellationToken ct = default);
}

// ── Package ───────────────────────────────────────────────────────────────────
public interface IPackageRepository
{
    Task<Package?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Package?> GetByBarcodeAsync(string barcode, CancellationToken ct = default);
    Task<List<Package>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<List<Package>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<List<Package>> GetBySackAsync(Guid sackId, CancellationToken ct = default);
    Task<List<Package>> GetByStatusAsync(PackageStatus status, CancellationToken ct = default);
    Task<bool> BarcodeExistsAsync(string barcode, CancellationToken ct = default);
    Task AddAsync(Package package, CancellationToken ct = default);
    Task UpdateAsync(Package package, CancellationToken ct = default);
}

// ── ChinaWaybill ──────────────────────────────────────────────────────────────
public interface IChinaWaybillRepository
{
    Task<ChinaWaybill?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ChinaWaybill?> GetByWaybillNoAsync(string waybillNo, CancellationToken ct = default);
    Task<List<ChinaWaybill>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task AddAsync(ChinaWaybill waybill, CancellationToken ct = default);
    Task UpdateAsync(ChinaWaybill waybill, CancellationToken ct = default);
}

// ── Sack ──────────────────────────────────────────────────────────────────────
public interface ISackRepository
{
    Task<Sack?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Sack?> GetBySackCodeAsync(string sackCode, CancellationToken ct = default);
    Task<List<Sack>> GetByTripAsync(Guid containerTripId, CancellationToken ct = default);
    Task<List<Sack>> GetByStatusAsync(SackStatus status, CancellationToken ct = default);
    Task AddAsync(Sack sack, CancellationToken ct = default);
    Task UpdateAsync(Sack sack, CancellationToken ct = default);
}

// ── ContainerTrip ─────────────────────────────────────────────────────────────
public interface IContainerTripRepository
{
    Task<ContainerTrip?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ContainerTrip?> GetByTripCodeAsync(string tripCode, CancellationToken ct = default);
    Task<List<ContainerTrip>> GetByStatusAsync(ContainerTripStatus status, CancellationToken ct = default);
    Task AddAsync(ContainerTrip trip, CancellationToken ct = default);
    Task UpdateAsync(ContainerTrip trip, CancellationToken ct = default);
}

// ── CustomsClearance ──────────────────────────────────────────────────────────
public interface ICustomsClearanceRepository
{
    Task<CustomsClearance?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CustomsClearance?> GetByTripAsync(Guid containerTripId, CancellationToken ct = default);
    Task<List<CustomsClearance>> GetByStatusAsync(CustomsClearanceStatus status, CancellationToken ct = default);
    Task AddAsync(CustomsClearance clearance, CancellationToken ct = default);
    Task UpdateAsync(CustomsClearance clearance, CancellationToken ct = default);
}

// ── Tracking ──────────────────────────────────────────────────────────────────
public interface ITrackingEventRepository
{
    Task<List<TrackingEvent>> GetByPackageAsync(Guid packageId, CancellationToken ct = default);
    Task AddAsync(TrackingEvent evt, CancellationToken ct = default);
}

public interface IWarehouseReceiptRepository
{
    Task<WarehouseReceipt?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WarehouseReceipt>> GetByPackageAsync(Guid packageId, CancellationToken ct = default);
    Task AddAsync(WarehouseReceipt receipt, CancellationToken ct = default);
}

public interface IWarehouseDispatchRepository
{
    Task<WarehouseDispatch?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<WarehouseDispatch>> GetByPackageAsync(Guid packageId, CancellationToken ct = default);
    Task AddAsync(WarehouseDispatch dispatch, CancellationToken ct = default);
}

// ── Delivery ──────────────────────────────────────────────────────────────────
public interface IDeliveryRequestRepository
{
    Task<DeliveryRequest?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<DeliveryRequest>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<List<DeliveryRequest>> GetByStatusAsync(DeliveryRequestStatus status, CancellationToken ct = default);
    Task AddAsync(DeliveryRequest request, CancellationToken ct = default);
    Task UpdateAsync(DeliveryRequest request, CancellationToken ct = default);
}

public interface IDomesticCarrierRepository
{
    Task<DomesticCarrier?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<DomesticCarrier>> GetAllActiveAsync(CancellationToken ct = default);
    Task AddAsync(DomesticCarrier carrier, CancellationToken ct = default);
    Task UpdateAsync(DomesticCarrier carrier, CancellationToken ct = default);
}

public interface IDomesticWaybillRepository
{
    Task<DomesticWaybill?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DomesticWaybill?> GetByTrackingNoAsync(string trackingNo, CancellationToken ct = default);
    Task<List<DomesticWaybill>> GetByDeliveryRequestAsync(Guid deliveryRequestId, CancellationToken ct = default);
    Task AddAsync(DomesticWaybill waybill, CancellationToken ct = default);
    Task UpdateAsync(DomesticWaybill waybill, CancellationToken ct = default);
}

// ── Claims ────────────────────────────────────────────────────────────────────
public interface IMissingClaimRepository
{
    Task<MissingClaim?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<MissingClaim>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<List<MissingClaim>> GetByStatusAsync(MissingClaimStatus status, CancellationToken ct = default);
    Task AddAsync(MissingClaim claim, CancellationToken ct = default);
    Task UpdateAsync(MissingClaim claim, CancellationToken ct = default);
}

public interface IInsuranceClaimRepository
{
    Task<InsuranceClaim?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<InsuranceClaim>> GetByPackageAsync(Guid packageId, CancellationToken ct = default);
    Task AddAsync(InsuranceClaim claim, CancellationToken ct = default);
    Task UpdateAsync(InsuranceClaim claim, CancellationToken ct = default);
}

public interface IStoragePenaltyRepository
{
    Task<List<StoragePenalty>> GetUnchargedAsync(CancellationToken ct = default);
    Task<List<StoragePenalty>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task AddAsync(StoragePenalty penalty, CancellationToken ct = default);
    Task UpdateAsync(StoragePenalty penalty, CancellationToken ct = default);
}
