// Types cho Module 2 — Logistics & Tracking.
// Khớp với DTO ở BE: LG.Module2.ApplicationServices/DTOs/Package/PackageDTOs.cs
// Enum serialize PascalCase (JsonStringEnumConverter).

export type PackageStatus =
  | "PendingCn"
  | "InCnWarehouse"
  | "InSack"
  | "InTransit"
  | "Customs"
  | "InVnWarehouse"
  | "Dispatched"
  | "Delivered"
  | "Lost"
  | "Returned";

export type PackagingType = "Normal" | "Fragile" | "Oversized" | "LiquidRisk";

export type InsuranceLevel = "Basic" | "Full";

export type TrackingEventType =
  | "CnWarehouseIn"
  | "CnWarehouseOut"
  | "BorderCustoms"
  | "VnWarehouseIn"
  | "OutForDelivery"
  | "Delivered"
  | "DeliveryFailed"
  | "Exception";

// ── PackageSummaryResponse (GET /api/my/packages) ─────────────────────────────
export interface PackageSummary {
  id: string;
  barcode: string;
  status: PackageStatus;
  packagingType: PackagingType;
  customerId: string;
  orderId: string;
  actualWeightKg: number | null;
  chargedWeightKg: number | null;
  insuranceOpted: boolean;
  insuranceLevel: InsuranceLevel | null;
  createdAt: string;
}

// ── TrackingEventResponse (GET /api/my/packages/{id}/tracking) ────────────────
// Lưu ý: field BE là `occuredAt` (đúng theo DTO, không phải occurredAt).
export interface TrackingEvent {
  id: string;
  type: TrackingEventType;
  typeLabel: string;
  location: string | null;
  note: string | null;
  occuredAt: string;
}

// ── PackageDetailResponse (GET /api/packages/{id} — staff) ────────────────────
export interface PackageDetail extends PackageSummary {
  waybillId: string | null;
  sackId: string | null;
  zoneId: string | null;
  zoneCode: string | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  volWeightKg: number | null;
  trackingHistory: TrackingEvent[];
  updatedAt: string;
}

// ── PackageFeeResponse (GET /api/packages/{id}/fee) ───────────────────────────
export interface PackageFee {
  packageId: string;
  barcode: string;
  status: PackageStatus;
  chargedWeightKg: number | null;
  ratePerKgVnd: number | null;
  shipIntlVnd: number | null;
  insuranceOpted: boolean;
  insuranceFeeVnd: number | null;
  totalFeeVnd: number | null;
  calculatedAt: string | null;
}

// ── Warehouse & receive (UC-2.01, 2.06 — staff) ──────────────────────────────
export type WarehouseType = "ChinaTransit" | "VnHub" | "VnLastMile";
export type ReceiptCondition = "Ok" | "Damaged" | "Missing";

export interface Warehouse {
  id: string;
  name: string;
  type: WarehouseType;
  country: string;
  city: string;
  address: string | null;
  maxCapacityM3: number | null;
  isActive: boolean;
}

// CnWarehouseReceiveRequest body (POST /api/warehouses/{id}/receive-cn)
export interface ReceiveCnBody {
  barcode: string;
  waybillNo?: string;
  actualWeightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  condition: ReceiptCondition;
  note?: string;
  deviceId?: string;
}

// VnWarehouseReceiveRequest body (POST /api/warehouses/{id}/receive-vn)
export interface ReceiveVnBody {
  barcode: string;
  zoneCode: string;
  actualWeightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  condition: ReceiptCondition;
  note?: string;
  deviceId?: string;
}

// ReceiveScanResult — trả về sau khi quét nhập kho
export interface ReceiveScanResult {
  packageId: string;
  barcode: string;
  status: PackageStatus;
  customerName: string;
  orderCode: string;
  chargedWeightKg: number | null;
  weightVarianceAlert: boolean;
  variancePct: number | null;
  condition: ReceiptCondition;
  receivedAt: string;
}

// ── Package create / image / fee (UC-2.07 — staff) ────────────────────────────
export type PackageImageType = "Receipt" | "Dispatch" | "Damage" | "Inspection";

// CreatePackageRequest body (POST /api/packages)
export interface CreatePackageBody {
  customerId: string;
  orderId: string;
  packagingType?: PackagingType;
  insuranceOpted?: boolean;
  insuranceLevel?: InsuranceLevel | null;
}

export interface PackageImage {
  id: string;
  type: PackageImageType;
  url: string;
  note: string | null;
  createdAt: string;
}

// UploadPackageImageRequest body (POST /api/packages/{id}/images)
export interface UploadPackageImageBody {
  type: PackageImageType;
  url: string;
  note?: string;
}

// CalculateFeeRequest body (POST /api/packages/{id}/calculate-fee)
export interface CalculateFeeBody {
  ratePerKgVnd: number;
  insuranceRate?: number; // 0.02 = 2% giá trị khai báo
  declaredValueVnd?: number;
}

// ── Sack / Container / Customs (UC-2.03, 2.04, 2.05 — staff) ──────────────────
export type SackStatus = "Packing" | "Sealed" | "InTransit" | "Arrived" | "Opened";
export type ContainerTripStatus = "Loading" | "Departed" | "Border" | "ArrivedVn";
export type BorderCrossing = "HuuNghi" | "LaoCai" | "MongCai";
export type CustomsStatus = "Pending" | "Processing" | "Cleared" | "Held";
export type ClearanceType = "Tmdt" | "TieuNgach" | "ChinhNgach";

// Sack
export interface SackSummary {
  id: string;
  sackCode: string;
  status: SackStatus;
  totalWeightKg: number;
  totalPackages: number;
  sealCode: string | null;
  containerTripId: string | null;
  createdAt: string;
}

export interface SackPackageItem {
  packageId: string;
  barcode: string;
  packageStatus: PackageStatus;
  packagingType: PackagingType;
  chargedWeightKg: number | null;
  addedAt: string;
}

export interface SackDetail extends SackSummary {
  packages: SackPackageItem[];
  updatedAt: string;
}

export interface CreateSackBody {
  sackCode?: string; // null/bỏ trống = BE tự sinh
}
export interface AddPackageToSackBody {
  barcode: string;
}
export interface SealSackBody {
  sealCode: string;
}

// Container trip
export interface TripSummary {
  id: string;
  tripCode: string;
  status: ContainerTripStatus;
  borderCrossing: BorderCrossing;
  vehiclePlate: string | null;
  driverPhone: string | null;
  totalSacks: number;
  departureCnAt: string | null;
  etaVnAt: string | null;
  arrivedVnAt: string | null;
  createdAt: string;
}

export interface TripSackItem {
  sackId: string;
  sackCode: string;
  sackStatus: SackStatus;
  totalWeightKg: number;
  totalPackages: number;
  sealCode: string | null;
}

export interface TripDetail {
  id: string;
  tripCode: string;
  status: ContainerTripStatus;
  borderCrossing: BorderCrossing;
  vehiclePlate: string | null;
  driverPhone: string | null;
  departureCnAt: string | null;
  etaVnAt: string | null;
  arrivedVnAt: string | null;
  sacks: TripSackItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripBody {
  tripCode: string;
  borderCrossing: BorderCrossing;
  vehiclePlate?: string;
  driverPhone?: string;
  etaVnAt?: string;
}
export interface AssignSacksBody {
  sackCodes: string[]; // ⚠️ mã bao, không phải id
}
export interface DepartTripBody {
  departureAt: string;
}
export interface ArriveVnBody {
  arrivedAt: string;
}

// Customs clearance
export interface CustomsClearance {
  id: string;
  containerTripId: string;
  tripCode: string | null;
  status: CustomsStatus;
  clearanceType: ClearanceType;
  declaredValueVnd: number | null;
  hsCodeSummary: string | null;
  customsOfficerName: string | null;
  dutyPaidVnd: number | null;
  heldReason: string | null;
  affectedPackages: number;
  clearedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomsBody {
  containerTripId: string;
  clearanceType: ClearanceType;
  declaredValueVnd?: number;
  hsCodeSummary?: string;
}
export interface UpdateCustomsBody {
  status: CustomsStatus;
  heldReason?: string;
  customsOfficerName?: string;
  dutyPaidVnd?: number;
}

// ── Delivery (UC-2.08) ────────────────────────────────────────────────────────
// Khớp DTO: LG.Module2.ApplicationServices/DTOs/Delivery/DeliveryDTOs.cs
// Status serialize bằng .ToString() của enum → PascalCase.

export type DeliveryRequestStatus =
  | "Pending"
  | "Confirmed"
  | "Shipping"
  | "Delivered"
  | "Failed"
  | "Cancelled";

export type WaybillStatus =
  | "Created"
  | "PickedUp"
  | "InTransit"
  | "OutForDelivery"
  | "Delivered"
  | "DeliveryFailed"
  | "Returned"
  | "Cancelled";

export interface DeliveryPackageItem {
  packageId: string;
  barcode: string;
  status: PackageStatus;
}

export interface DeliveryWaybillItem {
  id: string;
  trackingNo: string;
  carrierName: string;
  status: WaybillStatus;
  carrierFeeVnd: number | null;
  deliveryAttemptCount: number;
  failedReason: string | null;
  lastStatusAt: string | null;
}

// DeliveryRequestResponse (POST/GET /api/delivery-requests)
export interface DeliveryRequest {
  id: string;
  customerId: string;
  status: DeliveryRequestStatus;
  deliveryAddressId: string;
  preferredTimeSlot: string | null;
  codAmount: number | null;
  shipFeeVnd: number | null;
  carrierId: string | null;
  carrierName: string | null;
  packages: DeliveryPackageItem[];
  waybills: DeliveryWaybillItem[];
  createdAt: string;
  updatedAt: string;
}

// CreateDeliveryRequest body
export interface CreateDeliveryRequestBody {
  packageIds: string[];
  carrierId: string;
  deliveryAddressId: string;
  recipientName: string;
  recipientTel: string;
  province: string;
  district: string;
  ward: string;
  address: string;
  preferredTimeSlot?: string;
  codAmount?: number;
}

// ── Claims (UC-2.10) ──────────────────────────────────────────────────────────
// Khớp DTO: LG.Module2.ApplicationServices/DTOs/Claim/ClaimDTOs.cs

// BE có thêm "Confirmed" trong enum nhưng ClaimService không bao giờ set →
// chỉ 4 trạng thái còn lại xuất hiện thực tế.
export type MissingClaimStatus =
  | "Submitted"
  | "Investigating"
  | "Confirmed"
  | "Resolved"
  | "Rejected";

export type MissingClaimResolution = "Refund" | "Reship" | "Rejected";

export type InsuranceClaimStatus =
  | "Submitted"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "Paid";

// MissingClaimResponse
export interface MissingClaim {
  id: string;
  packageId: string;
  barcode: string;
  customerId: string;
  status: MissingClaimStatus;
  description: string | null;
  evidenceUrls: string[];
  claimedValueVnd: number | null;
  insuranceCoveragePct: number | null; // 0.5 | 1.0
  resolvedAmountVnd: number | null;
  resolution: MissingClaimResolution | null;
  staffNote: string | null;
  insuranceClaimId: string | null; // InsuranceClaim tạo tự động khi resolve=Refund
  createdAt: string;
  updatedAt: string;
}

// CreateMissingClaimRequest body (POST /api/missing-claims)
export interface CreateMissingClaimBody {
  packageId: string;
  description: string;
  evidenceUrls?: string[];
  claimedValueVnd?: number;
}

// InvestigateClaimRequest body (POST /api/missing-claims/{id}/investigate)
export interface InvestigateClaimBody {
  staffNote?: string;
}

// ResolveMissingClaimRequest body (POST /api/missing-claims/{id}/resolve)
export interface ResolveMissingClaimBody {
  resolution: MissingClaimResolution;
  claimedValueVnd?: number; // staff điều chỉnh giá trị nếu cần
  staffNote?: string;
}

// RejectClaimRequest body (POST /api/missing-claims/{id}/reject)
export interface RejectClaimBody {
  reason: string;
}

// InsuranceClaimResponse — KHÔNG có description/claimedAmountVnd (BE không trả về).
export interface InsuranceClaim {
  id: string;
  packageId: string;
  barcode: string;
  orderId: string;
  missingClaimId: string | null;
  status: InsuranceClaimStatus;
  damagePhotos: string[];
  approvedAmount: number | null;
  adjusterNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// CreateInsuranceClaimRequest body (POST /api/insurance-claims)
export interface CreateInsuranceClaimBody {
  packageId: string;
  claimedAmountVnd: number;
  description: string;
  damagePhotos?: string[];
  missingClaimId?: string;
}

// UpdateInsuranceClaimRequest body (PUT /api/insurance-claims/{id})
// BE chỉ chấp nhận Approved / Rejected / UnderReview.
export interface UpdateInsuranceClaimBody {
  status: InsuranceClaimStatus;
  approvedAmountVnd?: number;
  notes?: string;
}

// ── AI Phase 8 — Transit forecast & Border alerts ─────────────────────────────
export type AlertSeverity = "Low" | "Medium" | "High" | "Critical";
export type AlertSource = "NewsScrape" | "InternalData";

// TransitForecastResponse (POST /api/ai/transit-forecasts)
export interface TransitForecast {
  id: string;
  originProvinceCn: string;
  weightKg: number;
  carrierCn: string;
  borderCrossing: string;
  season: string | null;
  estDaysMin: number;
  estDaysMax: number;
  confidencePct: number;
  borderAlertApplied: boolean; // đang có cảnh báo tắc biên trên cửa khẩu này
  forecastedAt: string;
}

// TransitForecastRequest body
export interface TransitForecastBody {
  originProvinceCn: string;
  weightKg: number;
  carrierCn: string;
  borderCrossing: BorderCrossing;
  season?: string; // spring/summer/autumn/winter/tet — bỏ trống BE tự suy từ tháng
}

// BorderAlertResponse
export interface BorderAlert {
  id: string;
  affectedBorder: BorderCrossing;
  severity: AlertSeverity;
  source: AlertSource;
  estimatedDelayDays: number | null;
  description: string | null;
  notifiedCustomersCount: number;
  isActive: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

// CreateBorderAlertRequest body (staff)
export interface CreateBorderAlertBody {
  affectedBorder: BorderCrossing;
  severity: AlertSeverity;
  estimatedDelayDays?: number;
  description?: string;
}

// CongestionScanResult (POST /api/ai/border-alerts/scan)
export interface CongestionScanResult {
  bordersScanned: number;
  alertsCreated: number;
  alerts: BorderAlert[];
}

// WebhookResult (POST /api/domestic-waybills/{trackingNo}/sync)
export interface WaybillSyncResult {
  trackingNo: string;
  newStatus: string;
  processed: boolean;
  affectedPackages: number;
}
