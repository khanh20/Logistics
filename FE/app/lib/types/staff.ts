// ── Assignment queue (portal NV) ──────────────────────────────────────────────
export interface StaffQueueItemDto {
  assignmentId: string;
  orderId: string;
  orderCode: string;
  orderStatus: string;
  orderStatusLabel: string;
  assignmentStatus: string;
  finalAmountVnd: number;
  itemCount: number;
  assignedAt: string;
  slaDeadline: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  isOverdue: boolean;
  handlingMinutes: number | null;
}

// ── Work setting ──────────────────────────────────────────────────────────────
export interface StaffWorkSettingDto {
  staffId: string;
  staffName: string | null;
  staffEmail: string | null;
  isAvailable: boolean;
  autoAssignEnabled: boolean;
  maxConcurrentOrders: number;
  shiftStartLocal: string | null;
  shiftEndLocal: string | null;
  lastActiveAt: string | null;
  activeLoad: number;
}

export interface UpdateWorkSettingRequest {
  isAvailable: boolean;
  autoAssignEnabled: boolean;
  maxConcurrentOrders: number;
  shiftStartLocal: string | null;
  shiftEndLocal: string | null;
}

// ── KPI ───────────────────────────────────────────────────────────────────────
export interface StaffKpiPointDto {
  date: string;
  ordersAssigned: number;
  ordersCompleted: number;
  onTimeCount: number;
  overdueCount: number;
  cancelledCount: number;
  avgHandlingMinutes: number;
}

export interface StaffKpiDto {
  staffId: string;
  staffName: string | null;
  from: string;
  to: string;
  ordersAssigned: number;
  ordersCompleted: number;
  onTimeCount: number;
  overdueCount: number;
  cancelledCount: number;
  avgHandlingMinutes: number;
  onTimeRate: number;
  series: StaffKpiPointDto[];
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface StaffNotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  refOrderId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── Complaint ─────────────────────────────────────────────────────────────────
export type ComplaintType =
  | "WrongItem" | "Damaged" | "Missing" | "NotAsDescribed" | "Late" | "Other";

export type ComplaintStatus =
  | "New" | "InReview" | "AwaitingCustomer" | "Resolved" | "Rejected";

export interface ComplaintResponse {
  id: string;
  orderId: string;
  orderCode: string;
  orderItemId: string | null;
  customerId: string;
  type: string;
  description: string;
  evidenceUrls: string[];
  status: string;
  assignedToStaffId: string | null;
  assignedToStaffName: string | null;
  resolution: string | null;
  resolvedAmountVnd: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface SubmitComplaintRequest {
  type: string;
  description: string;
  orderItemId?: string | null;
  evidenceUrls?: string[];
}

export interface ResolveComplaintRequest {
  resolution: string;
  resolvedAmountVnd?: number | null;
}

export interface RejectComplaintRequest {
  reason: string;
}

export interface ComplaintQueueResult {
  items: ComplaintResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Supplier chat ─────────────────────────────────────────────────────────────
export interface SupplierChatLogDto {
  id: string;
  orderId: string;
  staffId: string;
  direction: string;
  message: string;
  screenshotUrl: string | null;
  platformChatTool: string | null;
  sentAt: string;
}

export interface AddSupplierChatRequest {
  direction: string;
  message: string;
  screenshotUrl?: string | null;
  platformChatTool?: string | null;
}
