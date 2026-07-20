import { apiModule2Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  PackageSummary,
  PackageDetail,
  TrackingEvent,
  PackageFee,
  DeliveryRequest,
  CreateDeliveryRequestBody,
  Warehouse,
  ReceiveCnBody,
  ReceiveVnBody,
  ReceiveScanResult,
  CreatePackageBody,
  PackageImage,
  UploadPackageImageBody,
  CalculateFeeBody,
  SackSummary,
  SackDetail,
  CreateSackBody,
  AddPackageToSackBody,
  SealSackBody,
  SackStatus,
  TripSummary,
  TripDetail,
  CreateTripBody,
  AssignSacksBody,
  DepartTripBody,
  ArriveVnBody,
  ContainerTripStatus,
  CustomsClearance,
  CreateCustomsBody,
  UpdateCustomsBody,
  CustomsStatus,
  MissingClaim,
  MissingClaimStatus,
  CreateMissingClaimBody,
  InvestigateClaimBody,
  ResolveMissingClaimBody,
  RejectClaimBody,
  InsuranceClaim,
  CreateInsuranceClaimBody,
  UpdateInsuranceClaimBody,
  TransitForecast,
  TransitForecastBody,
  BorderAlert,
  CreateBorderAlertBody,
  CongestionScanResult,
  WaybillSyncResult,
} from "~/lib/types/logistics";

// ── Customer-facing (UC tracking) ─────────────────────────────────────────────
export const myPackagesApi = {
  // GET /api/my/packages — toàn bộ kiện của khách (không phân trang ở BE)
  list: () =>
    apiModule2Client.get<unknown, ApiResponse<PackageSummary[]>>(
      "/api/my/packages"
    ),

  // GET /api/my/packages/{id}/tracking — lịch sử hành trình
  getTracking: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<TrackingEvent[]>>(
      `/api/my/packages/${id}/tracking`
    ),
};

// ── Delivery requests (UC-2.08, customer) ─────────────────────────────────────
export const deliveryRequestsApi = {
  // POST /api/delivery-requests
  create: (body: CreateDeliveryRequestBody) =>
    apiModule2Client.post<unknown, ApiResponse<DeliveryRequest>>(
      "/api/delivery-requests",
      body
    ),

  // GET /api/delivery-requests — yêu cầu của khách hiện tại
  list: () =>
    apiModule2Client.get<unknown, ApiResponse<DeliveryRequest[]>>(
      "/api/delivery-requests"
    ),

  // GET /api/delivery-requests/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<DeliveryRequest>>(
      `/api/delivery-requests/${id}`
    ),

  // DELETE /api/delivery-requests/{id} — chỉ khi Pending/Confirmed
  cancel: (id: string) =>
    apiModule2Client.delete<unknown, ApiResponse<DeliveryRequest>>(
      `/api/delivery-requests/${id}`
    ),
};

// ── Warehouse (UC-2.01, 2.06 — staff) ─────────────────────────────────────────
export const warehouseApi = {
  // GET /api/warehouses
  list: () =>
    apiModule2Client.get<unknown, ApiResponse<Warehouse[]>>("/api/warehouses"),

  // GET /api/warehouses/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<Warehouse>>(
      `/api/warehouses/${id}`
    ),

  // POST /api/warehouses/{id}/receive-cn — nhập kho TQ
  receiveCn: (id: string, body: ReceiveCnBody) =>
    apiModule2Client.post<unknown, ApiResponse<ReceiveScanResult>>(
      `/api/warehouses/${id}/receive-cn`,
      body
    ),

  // POST /api/warehouses/{id}/receive-vn — nhập kho VN
  receiveVn: (id: string, body: ReceiveVnBody) =>
    apiModule2Client.post<unknown, ApiResponse<ReceiveScanResult>>(
      `/api/warehouses/${id}/receive-vn`,
      body
    ),
};

// ── Package (staff — tra cứu, tạo, ảnh, tính cước) ────────────────────────────
export const packagesApi = {
  // POST /api/packages
  create: (body: CreatePackageBody) =>
    apiModule2Client.post<unknown, ApiResponse<PackageDetail>>(
      "/api/packages",
      body
    ),

  // GET /api/packages/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<PackageDetail>>(
      `/api/packages/${id}`
    ),

  // GET /api/packages/barcode/{barcode}
  getByBarcode: (barcode: string) =>
    apiModule2Client.get<unknown, ApiResponse<PackageDetail>>(
      `/api/packages/barcode/${encodeURIComponent(barcode)}`
    ),

  // GET /api/packages/{id}/tracking
  getTracking: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<TrackingEvent[]>>(
      `/api/packages/${id}/tracking`
    ),

  // POST /api/packages/{id}/images
  addImage: (id: string, body: UploadPackageImageBody) =>
    apiModule2Client.post<unknown, ApiResponse<PackageImage>>(
      `/api/packages/${id}/images`,
      body
    ),

  // POST /api/packages/{id}/calculate-fee  (UC-2.07)
  calculateFee: (id: string, body: CalculateFeeBody) =>
    apiModule2Client.post<unknown, ApiResponse<PackageFee>>(
      `/api/packages/${id}/calculate-fee`,
      body
    ),

  // POST /api/packages/{id}/charge-fee  (UC-2.07 — thu cước quốc tế, trừ ví khách)
  chargeFee: (id: string) =>
    apiModule2Client.post<unknown, ApiResponse<PackageFee>>(
      `/api/packages/${id}/charge-fee`
    ),

  // GET /api/packages/{id}/fee
  getFee: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<PackageFee>>(
      `/api/packages/${id}/fee`
    ),
};

// ── Sack (UC-2.03 — staff) ────────────────────────────────────────────────────
export const sacksApi = {
  // GET /api/sacks?status=  (lọc theo 1 status, mặc định BE = Packing)
  list: (status: SackStatus) =>
    apiModule2Client.get<unknown, ApiResponse<SackSummary[]>>("/api/sacks", {
      params: { status },
    }),

  // GET /api/sacks/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<SackDetail>>(`/api/sacks/${id}`),

  // GET /api/sacks/code/{sackCode}
  getByCode: (sackCode: string) =>
    apiModule2Client.get<unknown, ApiResponse<SackDetail>>(
      `/api/sacks/code/${encodeURIComponent(sackCode)}`
    ),

  // POST /api/sacks
  create: (body: CreateSackBody) =>
    apiModule2Client.post<unknown, ApiResponse<SackDetail>>("/api/sacks", body),

  // POST /api/sacks/{id}/packages
  addPackage: (id: string, body: AddPackageToSackBody) =>
    apiModule2Client.post<unknown, ApiResponse<SackDetail>>(
      `/api/sacks/${id}/packages`,
      body
    ),

  // DELETE /api/sacks/{id}/packages/{barcode}
  removePackage: (id: string, barcode: string) =>
    apiModule2Client.delete<unknown, ApiResponse<SackDetail>>(
      `/api/sacks/${id}/packages/${encodeURIComponent(barcode)}`
    ),

  // POST /api/sacks/{id}/seal
  seal: (id: string, body: SealSackBody) =>
    apiModule2Client.post<unknown, ApiResponse<SackDetail>>(
      `/api/sacks/${id}/seal`,
      body
    ),
};

// ── Container trip (UC-2.04 — staff) ──────────────────────────────────────────
export const containerTripsApi = {
  // GET /api/container-trips?status=  (mặc định BE = Loading)
  list: (status: ContainerTripStatus) =>
    apiModule2Client.get<unknown, ApiResponse<TripSummary[]>>(
      "/api/container-trips",
      { params: { status } }
    ),

  // GET /api/container-trips/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<TripDetail>>(
      `/api/container-trips/${id}`
    ),

  // POST /api/container-trips
  create: (body: CreateTripBody) =>
    apiModule2Client.post<unknown, ApiResponse<TripDetail>>(
      "/api/container-trips",
      body
    ),

  // POST /api/container-trips/{id}/assign-sacks
  assignSacks: (id: string, body: AssignSacksBody) =>
    apiModule2Client.post<unknown, ApiResponse<TripDetail>>(
      `/api/container-trips/${id}/assign-sacks`,
      body
    ),

  // POST /api/container-trips/{id}/depart
  depart: (id: string, body: DepartTripBody) =>
    apiModule2Client.post<unknown, ApiResponse<TripDetail>>(
      `/api/container-trips/${id}/depart`,
      body
    ),

  // POST /api/container-trips/{id}/reach-border  (KHÔNG body)
  reachBorder: (id: string) =>
    apiModule2Client.post<unknown, ApiResponse<TripDetail>>(
      `/api/container-trips/${id}/reach-border`
    ),

  // POST /api/container-trips/{id}/arrive-vn
  arriveVn: (id: string, body: ArriveVnBody) =>
    apiModule2Client.post<unknown, ApiResponse<TripDetail>>(
      `/api/container-trips/${id}/arrive-vn`,
      body
    ),
};

// ── Customs clearance (UC-2.05 — staff, quyền shipment.*) ──────────────────────
export const customsApi = {
  // GET /api/customs-clearances?status=  (mặc định BE = Pending)
  list: (status: CustomsStatus) =>
    apiModule2Client.get<unknown, ApiResponse<CustomsClearance[]>>(
      "/api/customs-clearances",
      { params: { status } }
    ),

  // GET /api/customs-clearances/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<CustomsClearance>>(
      `/api/customs-clearances/${id}`
    ),

  // GET /api/customs-clearances/by-trip/{tripId}  (có thể trả null nếu chưa có)
  getByTrip: (tripId: string) =>
    apiModule2Client.get<unknown, ApiResponse<CustomsClearance | null>>(
      `/api/customs-clearances/by-trip/${tripId}`
    ),

  // POST /api/customs-clearances
  create: (body: CreateCustomsBody) =>
    apiModule2Client.post<unknown, ApiResponse<CustomsClearance>>(
      "/api/customs-clearances",
      body
    ),

  // PUT /api/customs-clearances/{id}
  update: (id: string, body: UpdateCustomsBody) =>
    apiModule2Client.put<unknown, ApiResponse<CustomsClearance>>(
      `/api/customs-clearances/${id}`,
      body
    ),
};

// ── Missing claims (UC-2.10) ──────────────────────────────────────────────────
// create/listMine: customer (order.create/order.read); getDetail: complaint.read
// (customer CÓ quyền này); list/investigate/resolve/reject: complaint.manage (staff).
export const missingClaimsApi = {
  // POST /api/missing-claims
  create: (body: CreateMissingClaimBody) =>
    apiModule2Client.post<unknown, ApiResponse<MissingClaim>>(
      "/api/missing-claims",
      body
    ),

  // GET /api/my/missing-claims — khiếu nại của khách hiện tại
  listMine: () =>
    apiModule2Client.get<unknown, ApiResponse<MissingClaim[]>>(
      "/api/my/missing-claims"
    ),

  // GET /api/missing-claims?status=  (staff, lọc 1 status, mặc định BE = Submitted)
  list: (status: MissingClaimStatus) =>
    apiModule2Client.get<unknown, ApiResponse<MissingClaim[]>>(
      "/api/missing-claims",
      { params: { status } }
    ),

  // GET /api/missing-claims/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<MissingClaim>>(
      `/api/missing-claims/${id}`
    ),

  // POST /api/missing-claims/{id}/investigate
  investigate: (id: string, body: InvestigateClaimBody) =>
    apiModule2Client.post<unknown, ApiResponse<MissingClaim>>(
      `/api/missing-claims/${id}/investigate`,
      body
    ),

  // POST /api/missing-claims/{id}/resolve — Refund tự tạo InsuranceClaim + hoàn ví (stub)
  resolve: (id: string, body: ResolveMissingClaimBody) =>
    apiModule2Client.post<unknown, ApiResponse<MissingClaim>>(
      `/api/missing-claims/${id}/resolve`,
      body
    ),

  // POST /api/missing-claims/{id}/reject
  reject: (id: string, body: RejectClaimBody) =>
    apiModule2Client.post<unknown, ApiResponse<MissingClaim>>(
      `/api/missing-claims/${id}/reject`,
      body
    ),
};

// ── Insurance claims (UC-2.10) ────────────────────────────────────────────────
// Khách: listMine + getDetail (chỉ claim của mình — khác chủ BE trả 404).
// Staff không có list-all — tra theo id / link từ missing claim. review/pay: complaint.manage.
export const insuranceClaimsApi = {
  // POST /api/insurance-claims — kiện phải insuranceOpted (PACKAGE_NOT_INSURED)
  create: (body: CreateInsuranceClaimBody) =>
    apiModule2Client.post<unknown, ApiResponse<InsuranceClaim>>(
      "/api/insurance-claims",
      body
    ),

  // GET /api/my/insurance-claims — yêu cầu bồi thường của khách hiện tại
  listMine: () =>
    apiModule2Client.get<unknown, ApiResponse<InsuranceClaim[]>>(
      "/api/my/insurance-claims"
    ),

  // GET /api/insurance-claims/{id}
  getDetail: (id: string) =>
    apiModule2Client.get<unknown, ApiResponse<InsuranceClaim>>(
      `/api/insurance-claims/${id}`
    ),

  // PUT /api/insurance-claims/{id} — status ∈ UnderReview/Approved/Rejected
  review: (id: string, body: UpdateInsuranceClaimBody) =>
    apiModule2Client.put<unknown, ApiResponse<InsuranceClaim>>(
      `/api/insurance-claims/${id}`,
      body
    ),

  // POST /api/insurance-claims/{id}/pay — chỉ khi Approved (INVALID_CLAIM_STATE)
  pay: (id: string) =>
    apiModule2Client.post<unknown, ApiResponse<InsuranceClaim>>(
      `/api/insurance-claims/${id}/pay`
    ),
};

// ── AI Phase 8 (UC AItransit / AIborder) ──────────────────────────────────────
export const aiApi = {
  // POST /api/ai/transit-forecasts — khách/staff dự báo lead time TQ→VN
  forecast: (body: TransitForecastBody) =>
    apiModule2Client.post<unknown, ApiResponse<TransitForecast>>(
      "/api/ai/transit-forecasts",
      body
    ),

  // GET /api/ai/transit-forecasts/recent?limit= (staff — shipment.read)
  recentForecasts: (limit = 20) =>
    apiModule2Client.get<unknown, ApiResponse<TransitForecast[]>>(
      "/api/ai/transit-forecasts/recent",
      { params: { limit } }
    ),

  // GET /api/ai/border-alerts — cảnh báo đang active (khách xem được)
  listBorderAlerts: () =>
    apiModule2Client.get<unknown, ApiResponse<BorderAlert[]>>(
      "/api/ai/border-alerts"
    ),

  // POST /api/ai/border-alerts (staff — shipment.manage)
  createBorderAlert: (body: CreateBorderAlertBody) =>
    apiModule2Client.post<unknown, ApiResponse<BorderAlert>>(
      "/api/ai/border-alerts",
      body
    ),

  // POST /api/ai/border-alerts/{id}/resolve (staff)
  resolveBorderAlert: (id: string) =>
    apiModule2Client.post<unknown, ApiResponse<BorderAlert>>(
      `/api/ai/border-alerts/${id}/resolve`
    ),

  // POST /api/ai/border-alerts/scan — quét dữ liệu nội bộ tìm tắc biên (staff)
  scanBorderCongestion: () =>
    apiModule2Client.post<unknown, ApiResponse<CongestionScanResult>>(
      "/api/ai/border-alerts/scan"
    ),
};

// ── Domestic waybills (đối soát carrier — A2 Phase 6) ─────────────────────────
export const domesticWaybillsApi = {
  // POST /api/domestic-waybills/{trackingNo}/sync — query trạng thái từ carrier
  // rồi áp dụng như webhook (dùng khi nghi webhook miss). Staff shipment.manage.
  sync: (trackingNo: string) =>
    apiModule2Client.post<unknown, ApiResponse<WaybillSyncResult>>(
      `/api/domestic-waybills/${encodeURIComponent(trackingNo)}/sync`
    ),
};
