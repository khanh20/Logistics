import { apiModule1Client } from "./client";
import type { ApiResponse, Paginated } from "~/lib/types/common";
import type {
  OrderDetailResponse,
  OrderListItemResponse,
  StaffOrderListItemResponse,
  CancelOrderRequest,
  ManualPlacementRequest,
  UpdateTrackingRequest,
  RecordIssueRequest,
  OrderTransitionRequest,
  OrderStatus,
  StaffAssignmentDto,
  OverdueAssignmentDto,
  StaffWorkloadDto,
} from "~/lib/types/order";

// ── Customer-facing ───────────────────────────────────────────────────────────
export const customerOrdersApi = {
  list: (params: { status?: OrderStatus; page?: number; pageSize?: number }) =>
    apiModule1Client.get<
      unknown,
      ApiResponse<Paginated<OrderListItemResponse>>
    >("/api/orders", { params }),

  getDetail: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/orders/${id}`
    ),

  cancel: (id: string, req: CancelOrderRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/orders/${id}/cancel`,
      req
    ),

  payDeposit: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/orders/${id}/pay-deposit`
    ),
};

// ── Staff / Admin management ──────────────────────────────────────────────────
export const manageOrdersApi = {
  list: (params: {
    customerId?: string;
    staffId?: string;
    status?: OrderStatus;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) =>
    apiModule1Client.get<
      unknown,
      ApiResponse<Paginated<StaffOrderListItemResponse>>
    >("/api/manage/orders", { params }),

  getDetail: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}`
    ),

  assign: (id: string, staffId: string) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/assign`,
      { staffId }
    ),

  placeManual: (id: string, req: ManualPlacementRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/place-manual`,
      req
    ),

  updateTracking: (id: string, req: UpdateTrackingRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/tracking`,
      req
    ),

  arrivedChina: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/arrived-china`,
      req
    ),

  shippingToVN: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/shipping-to-vn`,
      req
    ),

  arrivedVietnam: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/arrived-vietnam`,
      req
    ),

  delivering: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/delivering`,
      req
    ),

  complete: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/complete`,
      req
    ),

  recordIssue: (id: string, req: RecordIssueRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/record-issue`,
      req
    ),

  cancelByStaff: (id: string, req: CancelOrderRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/cancel`,
      req
    ),

  markReturned: (id: string, req: OrderTransitionRequest) =>
    apiModule1Client.post<unknown, ApiResponse<OrderDetailResponse>>(
      `/api/manage/orders/${id}/return`,
      req
    ),
};

// ── Staff Assignment API ───────────────────────────────────────────────────────
export const staffAssignmentsApi = {
  autoAssign: (orderId: string, staffIds: string[]) =>
    apiModule1Client.post<unknown, ApiResponse<StaffAssignmentDto>>(
      `/api/manage/assignments/auto/${orderId}`,
      { staffIds }
    ),

  manualAssign: (orderId: string, staffId: string, note?: string) =>
    apiModule1Client.post<unknown, ApiResponse<StaffAssignmentDto>>(
      "/api/manage/assignments/manual",
      { orderId, staffId, note }
    ),

  reassign: (orderId: string, newStaffId: string, note?: string) =>
    apiModule1Client.put<unknown, ApiResponse<StaffAssignmentDto>>(
      `/api/manage/assignments/${orderId}/reassign`,
      { newStaffId, note }
    ),

  getOverdue: () =>
    apiModule1Client.get<unknown, ApiResponse<OverdueAssignmentDto[]>>(
      "/api/manage/assignments/overdue"
    ),

  getWorkload: (staffId: string) =>
    apiModule1Client.get<unknown, ApiResponse<StaffWorkloadDto>>(
      `/api/manage/assignments/workload/${staffId}`
    ),

  getActiveByOrder: (orderId: string) =>
    apiModule1Client.get<unknown, ApiResponse<StaffAssignmentDto>>(
      `/api/manage/assignments/order/${orderId}`
    ),
};
