import type { OrderStatus } from "~/lib/constants/orderStatus";

export type { OrderStatus };

// ── List items ────────────────────────────────────────────────────────────────
export interface OrderListItemResponse {
  id: string;
  orderCode: string;
  status: OrderStatus;
  statusLabel: string;
  shopId: string;
  shopName: string;
  itemCount: number;
  totalCny: number;
  depositVnd: number;
  rateVndPerCny: number;
  createdAt: string;
  thumbnailUrl: string | null;
}

export interface StaffOrderListItemResponse {
  id: string;
  orderCode: string;
  status: OrderStatus;
  statusLabel: string;
  customerId: string;
  customerEmail: string | null;
  assignedStaffId: string | null;
  shopId: string;
  shopName: string;
  placementMode: string;
  totalCny: number;
  depositVnd: number;
  createdAt: string;
}

// ── Detail ────────────────────────────────────────────────────────────────────
export interface OrderItemResponse {
  id: string;
  variantId: string;
  productTitle: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPriceCny: number;
  totalCny: number;
}

export interface OrderStatusHistoryResponse {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  changedBy: string | null;
  changedAt: string;
}

export interface PlatformOrderResponse {
  id: string;
  customerOrderId: string;
  platformOrderId: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  issueNote: string | null;
  hasIssue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFeeDetailResponse {
  feeType: string;
  amountVnd: number;
  note: string | null;
}

export interface OrderDetailResponse {
  id: string;
  orderCode: string;
  status: OrderStatus;
  statusLabel: string;
  customerId: string;
  assignedStaffId: string | null;
  shopId: string;
  shopName: string;
  placementMode: string;
  totalCny: number;
  depositPct: number;
  depositVnd: number;
  finalAmountVnd: number;
  rateVndPerCny: number;
  isDepositPaid: boolean;
  isFinalPaid: boolean;
  deliveryAddressNote: string | null;
  customerNote: string | null;
  staffNote: string | null;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  items: OrderItemResponse[];
  history: OrderStatusHistoryResponse[];
  platformOrder: PlatformOrderResponse | null;
  fees: OrderFeeDetailResponse[];
}

// ── Paginated list ────────────────────────────────────────────────────────────
export interface OrderListResponse {
  items: StaffOrderListItemResponse[];
  totalCount: number;
}

export interface CustomerOrderListResponse {
  items: OrderListItemResponse[];
  totalCount: number;
}

// ── Request types ─────────────────────────────────────────────────────────────
export interface CancelOrderRequest {
  reason: string;
}

export interface ManualPlacementRequest {
  platformOrderId: string;
  note?: string;
}

export interface UpdateTrackingRequest {
  trackingNumber: string;
  carrier: string;
  note?: string;
}

export interface RecordIssueRequest {
  issueNote: string;
}

export interface OrderTransitionRequest {
  note?: string;
}

export interface AssignOrderRequest {
  staffId: string;
}

// ── StaffAssignment types ─────────────────────────────────────────────────────
export interface StaffAssignmentDto {
  id: string;
  orderId: string;
  staffId: string;
  assignedAt: string;
  slaDeadline: string;
  completedAt: string | null;
  isOverdue: boolean;
  isAutoAssigned: boolean;
  note: string | null;
}

export interface OverdueAssignmentDto {
  assignmentId: string;
  orderId: string;
  orderCode: string;
  staffId: string;
  slaDeadline: string;
  overdueByMinutes: number;
  orderStatus: string;
}

export interface StaffWorkloadDto {
  staffId: string;
  activeCount: number;
  overdueCount: number;
  assignments: StaffAssignmentDto[];
}

// ── Filter ────────────────────────────────────────────────────────────────────
export interface OrderListFilter {
  customerId?: string;
  staffId?: string;
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  page: number;
  pageSize: number;
}
