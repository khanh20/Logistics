// Hằng số hiển thị cho Module 2 — Logistics & Tracking.
// Khớp enum BE (PascalCase). Style label/màu theo orderStatus.ts.
import type {
  PackageStatus,
  PackagingType,
  InsuranceLevel,
  TrackingEventType,
  DeliveryRequestStatus,
  WaybillStatus,
  WarehouseType,
  ReceiptCondition,
  PackageImageType,
  SackStatus,
  ContainerTripStatus,
  BorderCrossing,
  CustomsStatus,
  ClearanceType,
  MissingClaimStatus,
  MissingClaimResolution,
  InsuranceClaimStatus,
  AlertSeverity,
  AlertSource,
} from "~/lib/types/logistics";

// ── Package status ────────────────────────────────────────────────────────────
export const PACKAGE_STATUSES: PackageStatus[] = [
  "PendingCn",
  "InCnWarehouse",
  "InSack",
  "InTransit",
  "Customs",
  "InVnWarehouse",
  "Dispatched",
  "Delivered",
  "Lost",
  "Returned",
];

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  PendingCn:     "Chờ về kho TQ",
  InCnWarehouse: "Kho TQ",
  InSack:        "Đã đóng bao",
  InTransit:     "Đang vận chuyển",
  Customs:       "Thông quan",
  InVnWarehouse: "Kho VN",
  Dispatched:    "Đang giao",
  Delivered:     "Đã giao",
  Lost:          "Thất lạc",
  Returned:      "Hoàn hàng",
};

export const PACKAGE_STATUS_COLOR: Record<PackageStatus, string> = {
  PendingCn:     "bg-amber-100 text-amber-800",
  InCnWarehouse: "bg-indigo-100 text-indigo-800",
  InSack:        "bg-blue-100 text-blue-800",
  InTransit:     "bg-violet-100 text-violet-800",
  Customs:       "bg-yellow-100 text-yellow-800",
  InVnWarehouse: "bg-teal-100 text-teal-800",
  Dispatched:    "bg-sky-100 text-sky-800",
  Delivered:     "bg-green-100 text-green-800",
  Lost:          "bg-red-100 text-red-800",
  Returned:      "bg-orange-100 text-orange-800",
};

// Trạng thái kết thúc (không còn cập nhật)
export const PACKAGE_TERMINAL_STATUSES: PackageStatus[] = [
  "Delivered",
  "Lost",
  "Returned",
];

// ── Packaging type ────────────────────────────────────────────────────────────
export const PACKAGING_TYPE_LABEL: Record<PackagingType, string> = {
  Normal:     "Thường",
  Fragile:    "Dễ vỡ",
  Oversized:  "Quá khổ",
  LiquidRisk: "Chất lỏng",
};

export const PACKAGING_TYPES: PackagingType[] = [
  "Normal",
  "Fragile",
  "Oversized",
  "LiquidRisk",
];

// ── Insurance level ───────────────────────────────────────────────────────────
export const INSURANCE_LEVEL_LABEL: Record<InsuranceLevel, string> = {
  Basic: "Cơ bản (50%)",
  Full:  "Toàn phần (100%)",
};

export const INSURANCE_LEVELS: InsuranceLevel[] = ["Basic", "Full"];

// ── Warehouse (staff) ─────────────────────────────────────────────────────────
export const WAREHOUSE_TYPE_LABEL: Record<WarehouseType, string> = {
  ChinaTransit: "Kho trung chuyển TQ",
  VnHub:        "Kho trung tâm VN",
  VnLastMile:   "Kho giao chặng cuối",
};

// Kho TQ dùng luồng receive-cn; kho VN dùng receive-vn.
export const CN_WAREHOUSE_TYPES: WarehouseType[] = ["ChinaTransit"];

// ── Receipt condition (UC-2.01/2.06) ──────────────────────────────────────────
export const RECEIPT_CONDITION_LABEL: Record<ReceiptCondition, string> = {
  Ok:      "Bình thường",
  Damaged: "Hư hỏng",
  Missing: "Thiếu hàng",
};

export const RECEIPT_CONDITIONS: ReceiptCondition[] = ["Ok", "Damaged", "Missing"];

// ── Package image type ────────────────────────────────────────────────────────
export const PACKAGE_IMAGE_TYPE_LABEL: Record<PackageImageType, string> = {
  Receipt:    "Nhập kho",
  Dispatch:   "Xuất kho",
  Damage:     "Sự cố/hư hỏng",
  Inspection: "Kiểm tra",
};

export const PACKAGE_IMAGE_TYPES: PackageImageType[] = [
  "Receipt",
  "Dispatch",
  "Damage",
  "Inspection",
];

// ── Tracking event type (icon cho timeline) ───────────────────────────────────
// typeLabel đã được BE trả về sẵn — map này chỉ dùng cho icon/màu.
export const TRACKING_EVENT_ICON: Record<TrackingEventType, string> = {
  CnWarehouseIn:  "📥",
  CnWarehouseOut: "📤",
  BorderCustoms:  "🛂",
  VnWarehouseIn:  "🏭",
  OutForDelivery: "🚚",
  Delivered:      "✅",
  DeliveryFailed: "⚠️",
  Exception:      "❗",
};

// ── Delivery request status (UC-2.08) ─────────────────────────────────────────
export const DELIVERY_STATUS_LABEL: Record<DeliveryRequestStatus, string> = {
  Pending:   "Chờ xử lý",
  Confirmed: "Đã xác nhận",
  Shipping:  "Đang giao",
  Delivered: "Đã giao",
  Failed:    "Giao thất bại",
  Cancelled: "Đã huỷ",
};

export const DELIVERY_STATUS_COLOR: Record<DeliveryRequestStatus, string> = {
  Pending:   "bg-amber-100 text-amber-800",
  Confirmed: "bg-blue-100 text-blue-800",
  Shipping:  "bg-sky-100 text-sky-800",
  Delivered: "bg-green-100 text-green-800",
  Failed:    "bg-red-100 text-red-800",
  Cancelled: "bg-gray-100 text-gray-600",
};

// Chỉ huỷ được khi chưa bàn giao carrier (khớp BE DeliveryNotCancellableException).
export const DELIVERY_CANCELLABLE_STATUSES: DeliveryRequestStatus[] = [
  "Pending",
  "Confirmed",
];

// ── Domestic waybill status (GHTK/GHN → nội bộ) ───────────────────────────────
export const WAYBILL_STATUS_LABEL: Record<WaybillStatus, string> = {
  Created:        "Đã tạo vận đơn",
  PickedUp:       "Đã lấy hàng",
  InTransit:      "Đang trung chuyển",
  OutForDelivery: "Đang giao",
  Delivered:      "Đã giao",
  DeliveryFailed: "Giao thất bại",
  Returned:       "Hoàn hàng",
  Cancelled:      "Đã huỷ",
};

export const WAYBILL_STATUS_COLOR: Record<WaybillStatus, string> = {
  Created:        "bg-indigo-100 text-indigo-800",
  PickedUp:       "bg-blue-100 text-blue-800",
  InTransit:      "bg-violet-100 text-violet-800",
  OutForDelivery: "bg-sky-100 text-sky-800",
  Delivered:      "bg-green-100 text-green-800",
  DeliveryFailed: "bg-red-100 text-red-800",
  Returned:       "bg-orange-100 text-orange-800",
  Cancelled:      "bg-gray-100 text-gray-600",
};

// ── Domestic carriers (BE không có endpoint list → seed theo EntityConfigurations) ─
// Scope Phase 6: CHỈ tích hợp GHTK. GHN/Viettel Post/J&T đã XOÁ hẳn khỏi BE
// (migration RemoveNonGhtkCarriers) — hệ thống chỉ còn 1 carrier.
export interface CarrierOption {
  id: string;
  name: string;
  maxWeightKg: number;
  maxValueVnd: number;
  isReal: boolean;
}

export const DOMESTIC_CARRIERS: CarrierOption[] = [
  { id: "B0000000-0000-0000-0000-000000000001", name: "GHTK", maxWeightKg: 30, maxValueVnd: 20_000_000, isReal: true },
];

// ── Sack status (UC-2.03) ─────────────────────────────────────────────────────
export const SACK_STATUSES: SackStatus[] = [
  "Packing",
  "Sealed",
  "InTransit",
  "Arrived",
  "Opened",
];
export const SACK_STATUS_LABEL: Record<SackStatus, string> = {
  Packing:   "Đang đóng bao",
  Sealed:    "Đã kẹp chì",
  InTransit: "Đang vận chuyển",
  Arrived:   "Đã về kho VN",
  Opened:    "Đã rã bao",
};
export const SACK_STATUS_COLOR: Record<SackStatus, string> = {
  Packing:   "bg-amber-100 text-amber-800",
  Sealed:    "bg-blue-100 text-blue-800",
  InTransit: "bg-violet-100 text-violet-800",
  Arrived:   "bg-teal-100 text-teal-800",
  Opened:    "bg-green-100 text-green-800",
};

// ── Container trip status (UC-2.04) ───────────────────────────────────────────
export const TRIP_STATUSES: ContainerTripStatus[] = [
  "Loading",
  "Departed",
  "Border",
  "ArrivedVn",
];
export const TRIP_STATUS_LABEL: Record<ContainerTripStatus, string> = {
  Loading:   "Đang xếp hàng",
  Departed:  "Đã xuất phát",
  Border:    "Qua cửa khẩu",
  ArrivedVn: "Đã về kho VN",
};
export const TRIP_STATUS_COLOR: Record<ContainerTripStatus, string> = {
  Loading:   "bg-amber-100 text-amber-800",
  Departed:  "bg-sky-100 text-sky-800",
  Border:    "bg-yellow-100 text-yellow-800",
  ArrivedVn: "bg-green-100 text-green-800",
};

// Action chuyển trạng thái kế tiếp theo status hiện tại (wizard).
export const TRIP_NEXT_ACTION: Record<
  ContainerTripStatus,
  { action: "depart" | "reachBorder" | "arriveVn"; label: string } | null
> = {
  Loading:   { action: "depart", label: "Xuất phát" },
  Departed:  { action: "reachBorder", label: "Qua cửa khẩu" },
  Border:    { action: "arriveVn", label: "Về đến kho VN" },
  ArrivedVn: null,
};

export const BORDER_CROSSINGS: BorderCrossing[] = ["HuuNghi", "LaoCai", "MongCai"];
export const BORDER_CROSSING_LABEL: Record<BorderCrossing, string> = {
  HuuNghi: "Hữu Nghị (Lạng Sơn)",
  LaoCai:  "Lào Cai",
  MongCai: "Móng Cái",
};

// ── Customs (UC-2.05) ─────────────────────────────────────────────────────────
export const CUSTOMS_STATUSES: CustomsStatus[] = [
  "Pending",
  "Processing",
  "Cleared",
  "Held",
];
export const CUSTOMS_STATUS_LABEL: Record<CustomsStatus, string> = {
  Pending:    "Chờ xử lý",
  Processing: "Đang xử lý",
  Cleared:    "Đã thông quan",
  Held:       "Bị giữ hàng",
};
export const CUSTOMS_STATUS_COLOR: Record<CustomsStatus, string> = {
  Pending:    "bg-amber-100 text-amber-800",
  Processing: "bg-blue-100 text-blue-800",
  Cleared:    "bg-green-100 text-green-800",
  Held:       "bg-red-100 text-red-800",
};

export const CLEARANCE_TYPES: ClearanceType[] = ["Tmdt", "TieuNgach", "ChinhNgach"];
export const CLEARANCE_TYPE_LABEL: Record<ClearanceType, string> = {
  Tmdt:       "TMĐT (hàng nhỏ)",
  TieuNgach:  "Tiểu ngạch",
  ChinhNgach: "Chính ngạch",
};

// ── Map errorCode BE → message (UC-2.08) ──────────────────────────────────────
export const DELIVERY_ERROR_MESSAGE: Record<string, string> = {
  EMPTY_DELIVERY_REQUEST:         "Vui lòng chọn ít nhất 1 kiện hàng.",
  PACKAGE_NOT_READY_FOR_DELIVERY: "Có kiện chưa sẵn sàng giao (chưa về kho VN).",
  CARRIER_INACTIVE:               "Đơn vị vận chuyển hiện không khả dụng.",
  PACKAGE_WEIGHT_EXCEEDED:        "Tổng cân nặng vượt giới hạn của đơn vị vận chuyển.",
  DOMESTIC_CARRIER_NOT_FOUND:     "Không tìm thấy đơn vị vận chuyển.",
  DELIVERY_REQUEST_NOT_FOUND:     "Không tìm thấy yêu cầu giao hàng.",
  DELIVERY_NOT_CANCELLABLE:       "Yêu cầu không thể huỷ ở trạng thái hiện tại.",
  CARRIER_CANCEL_FAILED:          "Hãng vận chuyển từ chối huỷ — đơn có thể đã được lấy hàng.",
  WALLET_OPERATION_FAILED:        "Thao tác với ví thất bại — kiểm tra số dư hoặc thử lại sau.",
  DELIVERY_ADDRESS_NOT_FOUND:     "Địa chỉ nhận không có trong sổ địa chỉ của bạn.",
  ADDRESS_LOOKUP_FAILED:          "Không kiểm tra được sổ địa chỉ, vui lòng thử lại sau.",
};

// ── Map errorCode BE → message (UC-2.03/2.04/2.05) ────────────────────────────
export const SHIPMENT_ERROR_MESSAGE: Record<string, string> = {
  SACK_NOT_FOUND:              "Không tìm thấy bao.",
  SACK_SEALED:                 "Bao đã kẹp chì, không thể thêm/xoá kiện.",
  SACK_MIXED_FRAGILE:          "Không được gộp kiện dễ vỡ với kiện thường trong cùng bao.",
  PACKAGE_ALREADY_IN_SACK:     "Kiện này đã nằm trong một bao khác.",
  PACKAGE_NOT_FOUND:           "Không tìm thấy kiện với mã vạch này.",
  CONTAINER_TRIP_NOT_FOUND:    "Không tìm thấy chuyến container.",
  CUSTOMS_CLEARANCE_NOT_FOUND: "Không tìm thấy hồ sơ hải quan.",
  DUPLICATE_CUSTOMS_CLEARANCE: "Chuyến này đã có hồ sơ hải quan.",
};

// ── Missing claim (UC-2.10) ───────────────────────────────────────────────────
// Enum BE có "Confirmed" nhưng ClaimService không bao giờ set → bỏ khỏi Segmented.
export const MISSING_CLAIM_STATUSES: MissingClaimStatus[] = [
  "Submitted",
  "Investigating",
  "Resolved",
  "Rejected",
];
export const MISSING_CLAIM_STATUS_LABEL: Record<MissingClaimStatus, string> = {
  Submitted:     "Mới gửi",
  Investigating: "Đang điều tra",
  Confirmed:     "Xác nhận thất lạc",
  Resolved:      "Đã xử lý",
  Rejected:      "Đã từ chối",
};
export const MISSING_CLAIM_STATUS_COLOR: Record<MissingClaimStatus, string> = {
  Submitted:     "bg-amber-100 text-amber-800",
  Investigating: "bg-blue-100 text-blue-800",
  Confirmed:     "bg-violet-100 text-violet-800",
  Resolved:      "bg-green-100 text-green-800",
  Rejected:      "bg-red-100 text-red-800",
};

// Trạng thái staff còn thao tác được (BE chặn Resolved/Rejected).
export const MISSING_CLAIM_ACTIONABLE_STATUSES: MissingClaimStatus[] = [
  "Submitted",
  "Investigating",
  "Confirmed",
];

export const MISSING_CLAIM_RESOLUTION_LABEL: Record<MissingClaimResolution, string> = {
  Refund:   "Hoàn tiền bồi thường",
  Reship:   "Gửi lại hàng",
  Rejected: "Từ chối",
};

// ── Insurance claim (UC-2.10) ─────────────────────────────────────────────────
export const INSURANCE_CLAIM_STATUS_LABEL: Record<InsuranceClaimStatus, string> = {
  Submitted:   "Mới gửi",
  UnderReview: "Đang thẩm định",
  Approved:    "Đã duyệt",
  Rejected:    "Đã từ chối",
  Paid:        "Đã chi trả",
};
export const INSURANCE_CLAIM_STATUS_COLOR: Record<InsuranceClaimStatus, string> = {
  Submitted:   "bg-amber-100 text-amber-800",
  UnderReview: "bg-blue-100 text-blue-800",
  Approved:    "bg-teal-100 text-teal-800",
  Rejected:    "bg-red-100 text-red-800",
  Paid:        "bg-green-100 text-green-800",
};

// PUT chỉ nhận 3 trạng thái này (Paid đi qua endpoint /pay riêng).
export const INSURANCE_REVIEW_STATUSES: InsuranceClaimStatus[] = [
  "UnderReview",
  "Approved",
  "Rejected",
];

// ── Map errorCode BE → message (UC-2.10) ──────────────────────────────────────
export const CLAIM_ERROR_MESSAGE: Record<string, string> = {
  MISSING_CLAIM_NOT_FOUND:   "Không tìm thấy khiếu nại.",
  INSURANCE_CLAIM_NOT_FOUND: "Không tìm thấy yêu cầu bồi thường.",
  INVALID_CLAIM_STATE:       "Không thể thực hiện ở trạng thái hiện tại của khiếu nại.",
  PACKAGE_NOT_INSURED:       "Kiện không mua bảo hiểm nên không thể bồi thường.",
  PACKAGE_NOT_FOUND:         "Không tìm thấy kiện hàng.",
};

// ── AI Phase 8 — Border alerts & forecast ─────────────────────────────────────
export const ALERT_SEVERITIES: AlertSeverity[] = ["Low", "Medium", "High", "Critical"];

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  Low:      "Thấp",
  Medium:   "Trung bình",
  High:     "Cao",
  Critical: "Nghiêm trọng",
};

export const ALERT_SEVERITY_COLOR: Record<AlertSeverity, string> = {
  Low:      "bg-blue-100 text-blue-700",
  Medium:   "bg-yellow-100 text-yellow-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

export const ALERT_SOURCE_LABEL: Record<AlertSource, string> = {
  NewsScrape:   "Tin tức",
  InternalData: "Dữ liệu vận hành",
};

// Season cho forecast — bỏ trống BE tự suy từ tháng hiện tại
export const SEASON_OPTIONS = [
  { value: "spring", label: "Xuân" },
  { value: "summer", label: "Hè" },
  { value: "autumn", label: "Thu" },
  { value: "winter", label: "Đông" },
  { value: "tet",    label: "Cận Tết (cao điểm)" },
];
