using LG.Module2.ApplicationServices.DTOs.AI;
using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.DTOs.Claim;
using LG.Module2.ApplicationServices.DTOs.Container;
using LG.Module2.ApplicationServices.DTOs.Customs;
using LG.Module2.ApplicationServices.DTOs.Delivery;
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
    Task SendCustomsHeldAlertAsync(Guid customerId, string barcode, string reason, CancellationToken ct = default);
    Task SendOutForDeliveryAsync(Guid customerId, string trackingNo, string carrierName, CancellationToken ct = default);
    Task SendDeliveredAsync(Guid customerId, string trackingNo, CancellationToken ct = default);
    Task SendDeliveryFailedAlertAsync(string trackingNo, int attemptCount, string? reason, CancellationToken ct = default);
    Task SendClaimResolvedAsync(Guid customerId, string claimType, string outcome, CancellationToken ct = default);
    Task SendRefundIssuedAsync(Guid customerId, decimal amountVnd, string reason, CancellationToken ct = default);
    Task SendBorderAlertAsync(Guid customerId, string borderName, string severity, int? estimatedDelayDays, CancellationToken ct = default);
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

// ── ICustomsService (UC-2.05) ─────────────────────────────────────────────────
public interface ICustomsService
{
    Task<CustomsClearanceResponse>        CreateAsync(CreateCustomsClearanceRequest req, CancellationToken ct = default);
    Task<CustomsClearanceResponse>        GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CustomsClearanceResponse?>       GetByTripAsync(Guid containerTripId, CancellationToken ct = default);
    Task<List<CustomsClearanceResponse>>  GetByStatusAsync(CustomsClearanceStatus status, CancellationToken ct = default);
    Task<CustomsClearanceResponse>        UpdateStatusAsync(Guid id, UpdateCustomsClearanceRequest req, CancellationToken ct = default);
}

// ── IFeeCalculationService (UC-2.07) ──────────────────────────────────────────
public interface IFeeCalculationService
{
    Task<PackageFeeResponse> CalculateAsync(Guid packageId, CalculateFeeRequest req, CancellationToken ct = default);
    Task<PackageFeeResponse> GetFeeAsync(Guid packageId, CancellationToken ct = default);
}

// ── ICarrierGateway (tích hợp carrier nội địa) ────────────────────────────────
public interface ICarrierGateway
{
    /// Carrier xử lý được không (theo tên). `IsFallback` = true cho gateway mặc định (stub).
    bool Supports(string carrierName);
    bool IsFallback { get; }

    /// Báo giá phí ship nội địa + phí bảo hiểm.
    Task<CarrierQuote> QuoteAsync(CarrierShipmentContext ctx, CancellationToken ct = default);

    /// Tạo vận đơn bên carrier, trả về mã tracking + phí carrier báo về.
    Task<CarrierWaybillResult> CreateWaybillAsync(CarrierShipmentContext ctx, CancellationToken ct = default);

    /// Map mã trạng thái raw của carrier → enum nội bộ.
    DomesticWaybillStatus MapStatus(string rawStatus);

    /// Xác thực webhook (HMAC hoặc token tuỳ carrier).
    bool VerifySignature(string? secret, CarrierWebhookRequest payload);
}

/// Chọn gateway phù hợp theo tên carrier (GHTK → GHTK thật, còn lại → stub).
public interface ICarrierGatewayResolver
{
    ICarrierGateway Resolve(string carrierName);
}

// ── IDeliveryService (UC-2.08) ────────────────────────────────────────────────
public interface IDeliveryService
{
    Task<DeliveryRequestResponse>       CreateAsync(Guid customerId, CreateDeliveryRequest req, CancellationToken ct = default);
    Task<DeliveryRequestResponse>       GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<DeliveryRequestResponse>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default);
    Task<DeliveryRequestResponse>       CancelAsync(Guid id, Guid customerId, CancellationToken ct = default);
}

// ── ITrackingService (UC-2.09 — webhook carrier) ──────────────────────────────
public interface ITrackingService
{
    Task<WebhookResult> ProcessWebhookAsync(string carrierName, CarrierWebhookRequest req, CancellationToken ct = default);
}

// ── IClaimService (UC-2.10 — khiếu nại & bảo hiểm) ────────────────────────────
public interface IClaimService
{
    // MissingClaim
    Task<MissingClaimResponse>       CreateMissingClaimAsync(Guid customerId, CreateMissingClaimRequest req, CancellationToken ct = default);
    Task<MissingClaimResponse>       GetMissingClaimAsync(Guid id, CancellationToken ct = default);
    Task<List<MissingClaimResponse>> GetMyMissingClaimsAsync(Guid customerId, CancellationToken ct = default);
    Task<List<MissingClaimResponse>> GetMissingClaimsByStatusAsync(MissingClaimStatus status, CancellationToken ct = default);
    Task<MissingClaimResponse>       InvestigateMissingClaimAsync(Guid id, InvestigateClaimRequest req, CancellationToken ct = default);
    Task<MissingClaimResponse>       ResolveMissingClaimAsync(Guid id, ResolveMissingClaimRequest req, CancellationToken ct = default);
    Task<MissingClaimResponse>       RejectMissingClaimAsync(Guid id, RejectClaimRequest req, CancellationToken ct = default);

    // InsuranceClaim
    Task<InsuranceClaimResponse>     CreateInsuranceClaimAsync(CreateInsuranceClaimRequest req, CancellationToken ct = default);
    Task<InsuranceClaimResponse>     GetInsuranceClaimAsync(Guid id, CancellationToken ct = default);
    Task<InsuranceClaimResponse>     UpdateInsuranceClaimAsync(Guid id, UpdateInsuranceClaimRequest req, CancellationToken ct = default);
    Task<InsuranceClaimResponse>     PayInsuranceClaimAsync(Guid id, CancellationToken ct = default);
}

// ── IAIForecastService (Phase 8 — stub, sẽ thay ruột bằng ML.NET/LLM sau) ─────
public interface IAIForecastService
{
    /// Dự báo lead time TQ→VN theo heuristic (baseline cửa khẩu + mùa + cảnh báo tắc biên đang active).
    Task<TransitForecastResponse> ForecastTransitAsync(TransitForecastRequest req, CancellationToken ct = default);
    Task<List<TransitForecastResponse>> GetRecentForecastsAsync(int limit = 20, CancellationToken ct = default);

    // Border alerts
    Task<BorderAlertResponse>       CreateBorderAlertAsync(CreateBorderAlertRequest req, CancellationToken ct = default);
    Task<List<BorderAlertResponse>> GetActiveBorderAlertsAsync(CancellationToken ct = default);
    Task<BorderAlertResponse>       GetBorderAlertAsync(Guid id, CancellationToken ct = default);
    Task<BorderAlertResponse>       ResolveBorderAlertAsync(Guid id, CancellationToken ct = default);

    /// Quét dữ liệu nội bộ (thời gian qua biên của ContainerTrip 7 ngày gần nhất vs baseline 30 ngày trước đó),
    /// tự tạo AIBorderAlert (source=InternalData) nếu phát hiện chậm bất thường.
    Task<CongestionScanResult> ScanBorderCongestionAsync(CancellationToken ct = default);
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
