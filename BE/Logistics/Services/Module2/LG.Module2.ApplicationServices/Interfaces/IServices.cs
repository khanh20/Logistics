using LG.Module2.ApplicationServices.DTOs.Container;
using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.DTOs.Sack;
using LG.Module2.ApplicationServices.DTOs.Warehouse;
using LG.Module2.Domain.Entities;

namespace LG.Module2.ApplicationServices.Interfaces;

// ── IBarcodeService ───────────────────────────────────────────────────────────
public interface IBarcodeService
{
    /// Sinh barcode nội bộ duy nhất cho kiện hàng. Format: LG-YYYYMMDD-XXXXXXXX
    Task<string> GenerateAsync(CancellationToken ct = default);
}

// ── INotificationService (stub — Phase 6/7 sẽ tích hợp Zalo/push) ────────────
public interface INotificationService
{
    Task SendPackageArrivedVnAsync(Guid customerId, string barcode, string orderCode, CancellationToken ct = default);
    Task SendWeightVarianceAlertAsync(Guid staffId, string barcode, decimal variancePct, CancellationToken ct = default);
}

// ── IWarehouseService ─────────────────────────────────────────────────────────
public interface IWarehouseService
{
    Task<List<WarehouseResponse>> GetAllAsync(CancellationToken ct = default);
    Task<WarehouseResponse> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// UC-2.01: NV kho TQ quét barcode, cân/đo, ghi WarehouseReceipt + PackageDimension.
    /// Alert nếu variance > 10% so với lần cân trước (nếu có).
    Task<ReceiveScanResult> ReceiveAtChinaWarehouseAsync(
        Guid warehouseId, Guid staffId, CnWarehouseReceiveRequest req, CancellationToken ct = default);

    /// UC-2.06: NV kho VN quét từng kiện sau khi rã bao, ghi zone, push TrackingEvent.
    Task<ReceiveScanResult> ReceiveAtVnWarehouseAsync(
        Guid warehouseId, Guid staffId, VnWarehouseReceiveRequest req, CancellationToken ct = default);
}

// ── ISackService ──────────────────────────────────────────────────────────────
public interface ISackService
{
    Task<SackDetailResponse>           CreateAsync(CreateSackRequest req, CancellationToken ct = default);
    Task<SackDetailResponse>           GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SackDetailResponse>           GetBySackCodeAsync(string sackCode, CancellationToken ct = default);
    Task<List<SackSummaryResponse>>    GetByStatusAsync(SackStatus status, CancellationToken ct = default);
    Task<SackDetailResponse>           AddPackageAsync(Guid sackId, Guid staffId, AddPackageToSackRequest req, CancellationToken ct = default);
    Task<SackDetailResponse>           RemovePackageAsync(Guid sackId, string barcode, CancellationToken ct = default);
    Task<SackDetailResponse>           SealAsync(Guid sackId, Guid staffId, SealSackRequest req, CancellationToken ct = default);
}

// ── IContainerService ─────────────────────────────────────────────────────────
public interface IContainerService
{
    Task<TripDetailResponse>        CreateTripAsync(CreateTripRequest req, CancellationToken ct = default);
    Task<TripDetailResponse>        GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<TripSummaryResponse>> GetByStatusAsync(ContainerTripStatus status, CancellationToken ct = default);
    Task<TripDetailResponse>        AssignSacksAsync(Guid tripId, AssignSacksRequest req, CancellationToken ct = default);
    Task<TripDetailResponse>        DepartAsync(Guid tripId, DepartTripRequest req, CancellationToken ct = default);
    Task<TripDetailResponse>        ReachBorderAsync(Guid tripId, CancellationToken ct = default);
    Task<TripDetailResponse>        ArriveVietnamAsync(Guid tripId, ArriveVietnamRequest req, CancellationToken ct = default);
}

// ── IPackageService ───────────────────────────────────────────────────────────
public interface IPackageService
{
    Task<PackageSummaryResponse>  CreateAsync(CreatePackageRequest req, CancellationToken ct = default);
    Task<PackageDetailResponse>   GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PackageDetailResponse>   GetByBarcodeAsync(string barcode, CancellationToken ct = default);
    Task<List<PackageSummaryResponse>> GetByOrderAsync(Guid orderId, CancellationToken ct = default);
    Task<List<PackageSummaryResponse>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<PackageImageResponse>    UploadImageAsync(Guid staffId, UploadPackageImageRequest req, CancellationToken ct = default);
    Task<List<TrackingEventResponse>> GetTrackingAsync(Guid packageId, CancellationToken ct = default);
}
