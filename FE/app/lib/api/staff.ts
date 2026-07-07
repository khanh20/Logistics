import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  StaffQueueItemDto,
  StaffWorkSettingDto,
  UpdateWorkSettingRequest,
  StaffKpiDto,
  StaffNotificationDto,
  ComplaintResponse,
  ComplaintQueueResult,
  ResolveComplaintRequest,
  RejectComplaintRequest,
  SubmitComplaintRequest,
  SupplierChatLogDto,
  AddSupplierChatRequest,
} from "~/lib/types/staff";

// ── Portal Nhân viên (self) ────────────────────────────────────────────────────
export const staffPortalApi = {
  // Assignments
  getMyQueue: (includeClosed = false) =>
    apiModule1Client.get<unknown, ApiResponse<StaffQueueItemDto[]>>(
      "/api/staff/assignments",
      { params: { includeClosed } }
    ),

  accept: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>(`/api/staff/assignments/${id}/accept`),

  start: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>(`/api/staff/assignments/${id}/start`),

  complete: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>(`/api/staff/assignments/${id}/complete`),

  // Work setting
  getMyWorkSetting: () =>
    apiModule1Client.get<unknown, ApiResponse<StaffWorkSettingDto>>("/api/staff/work-setting/mine"),

  updateMyWorkSetting: (req: UpdateWorkSettingRequest) =>
    apiModule1Client.put<unknown, ApiResponse<StaffWorkSettingDto>>("/api/staff/work-setting/mine", req),

  setAvailability: (online: boolean) =>
    apiModule1Client.post<unknown, ApiResponse<StaffWorkSettingDto>>(
      "/api/staff/work-setting/availability",
      null,
      { params: { online } }
    ),

  // KPI
  getMyKpi: (from?: string, to?: string) =>
    apiModule1Client.get<unknown, ApiResponse<StaffKpiDto>>("/api/staff/kpi/mine", {
      params: { from, to },
    }),

  // Notifications
  getNotifications: (unreadOnly = false) =>
    apiModule1Client.get<unknown, ApiResponse<StaffNotificationDto[]>>("/api/staff/notifications", {
      params: { unreadOnly },
    }),

  getUnreadCount: () =>
    apiModule1Client.get<unknown, ApiResponse<number>>("/api/staff/notifications/unread-count"),

  markRead: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>(`/api/staff/notifications/${id}/read`),

  markAllRead: () =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>("/api/staff/notifications/read-all"),

  // Supplier chat
  getSupplierChat: (orderId: string) =>
    apiModule1Client.get<unknown, ApiResponse<SupplierChatLogDto[]>>(
      `/api/staff/orders/${orderId}/supplier-chat`
    ),

  addSupplierChat: (orderId: string, req: AddSupplierChatRequest) =>
    apiModule1Client.post<unknown, ApiResponse<SupplierChatLogDto>>(
      `/api/staff/orders/${orderId}/supplier-chat`,
      req
    ),
};

// ── Complaints — CSKH staff side ────────────────────────────────────────────────
export const staffComplaintApi = {
  getQueue: (params: { status?: string; mine?: boolean; page?: number; pageSize?: number }) =>
    apiModule1Client.get<unknown, ApiResponse<ComplaintQueueResult>>("/api/staff/complaints", { params }),

  assignToMe: (id: string) =>
    apiModule1Client.post<unknown, ApiResponse<ComplaintResponse>>(`/api/staff/complaints/${id}/assign`),

  resolve: (id: string, req: ResolveComplaintRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ComplaintResponse>>(`/api/staff/complaints/${id}/resolve`, req),

  reject: (id: string, req: RejectComplaintRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ComplaintResponse>>(`/api/staff/complaints/${id}/reject`, req),
};

// ── Complaints — customer side ──────────────────────────────────────────────────
export const customerComplaintApi = {
  submit: (orderId: string, req: SubmitComplaintRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ComplaintResponse>>(
      `/api/orders/${orderId}/complaints`,
      req
    ),

  getByOrder: (orderId: string) =>
    apiModule1Client.get<unknown, ApiResponse<ComplaintResponse[]>>(
      `/api/orders/${orderId}/complaints`
    ),
};

// ── Admin — staff KPI + settings ────────────────────────────────────────────────
export const staffOpsAdminApi = {
  getTeamKpi: (from?: string, to?: string) =>
    apiModule1Client.get<unknown, ApiResponse<StaffKpiDto[]>>("/api/manage/staff-kpi", {
      params: { from, to },
    }),

  getStaffKpi: (staffId: string, from?: string, to?: string) =>
    apiModule1Client.get<unknown, ApiResponse<StaffKpiDto>>(`/api/manage/staff-kpi/${staffId}`, {
      params: { from, to },
    }),

  getAllSettings: () =>
    apiModule1Client.get<unknown, ApiResponse<StaffWorkSettingDto[]>>("/api/manage/staff-settings"),

  updateSetting: (staffId: string, req: UpdateWorkSettingRequest) =>
    apiModule1Client.put<unknown, ApiResponse<StaffWorkSettingDto>>(
      `/api/manage/staff-settings/${staffId}`,
      req
    ),
};
