import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { manageOrdersApi, staffAssignmentsApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { OrderTimeline } from "~/components/customer/OrderTimeline";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { ArrowLeft, CheckCircle, Package, WarningCircle, UserCircle, Phone } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { usersApi } from "~/lib/api/auth";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import type { OrderDetailResponse, OrderStatus, StaffAssignmentDto } from "~/lib/types/order";
import type { StaffUserDto } from "~/lib/types/auth";
import type { Route } from "./+types/orders.$id";

// Nhân viên có thể nhận đơn = user đang Active và có role khác "Customer".
function isAssignableStaff(u: StaffUserDto): boolean {
  return u.status === "Active" && u.roles.some((r) => r.toLowerCase() !== "customer");
}

function staffLabel(u: StaffUserDto): string {
  return u.fullName?.trim() ? `${u.fullName} · ${u.email}` : u.email;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết đơn hàng — MuaHo Admin" }];
}

// ── Helper: which actions are available for a given status ────────────────────
function availableActions(status: OrderStatus) {
  return {
    canAssign:         status === "Paid",
    canPlaceManual:    status === "AwaitingManualPlace",
    canUpdateTracking: status === "OrderedOnPlatform",
    canArrivedChina:   status === "ShippedFromShop",
    canShippingToVN:   status === "ArrivedChinaWh",
    canArrivedVN:      status === "ShippingToVN",
    canDelivering:     status === "ArrivedVietnam",
    canComplete:       status === "Delivering",
    canReturn:         status === "Delivering",
    canRecordIssue:    !["Completed","CancelledByTimeout","CancelledByCustomer","CancelledByStaff","Returned"].includes(status),
    canCancelByStaff:  ["AwaitingApiPlace","AwaitingManualPlace"].includes(status),
  };
}

// ── Fetch wrapper: render NGAY + skeleton (non-blocking) ──────────────────────
// Dùng chung cho cả /admin/orders/:id và /staff/orders/:id — chỉ khác nút "Quay lại".
export function OrderDetailView({ backTo = "/admin/orders" }: { backTo?: string }) {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data, loading, error } = useFetch<{
    order: OrderDetailResponse;
    assignment: StaffAssignmentDto | null;
    users: StaffUserDto[];
  }>(async () => {
    const [orderRes, assignmentRes, usersRes] = await Promise.allSettled([
      manageOrdersApi.getDetail(id!),
      staffAssignmentsApi.getActiveByOrder(id!), // 404 khi đơn chưa phân công → bỏ qua, assignment = null
      usersApi.getAll(1, 200),
    ]);
    const order = orderRes.status === "fulfilled" ? (orderRes.value.data as OrderDetailResponse) : null;
    if (!order) throw new Error(t("order.load_failed", "Không tải được đơn hàng."));
    const assignment =
      assignmentRes.status === "fulfilled" ? (assignmentRes.value.data as StaffAssignmentDto) : null;
    const users = usersRes.status === "fulfilled" ? usersRes.value.data?.data ?? [] : [];
    return { order, assignment, users };
  }, [id]);

  return (
    <FadeIn className="max-w-4xl space-y-5">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} weight="bold" />
        {t("order.back_to_list")}
      </Link>

      {loading && !data ? (
        <SkeletonPanel rows={8} cols={3} />
      ) : error || !data ? (
        <EmptyState icon={<WarningCircle size={40} />} title={error ?? t("common.error")} />
      ) : (
        <OrderDetailInner
          key={data.order.id}
          initialOrder={data.order}
          initialAssignment={data.assignment}
          users={data.users}
        />
      )}
    </FadeIn>
  );
}

export default function AdminOrderDetailPage() {
  return <OrderDetailView backTo="/admin/orders" />;
}

function OrderDetailInner({
  initialOrder,
  initialAssignment,
  users,
}: {
  initialOrder: OrderDetailResponse;
  initialAssignment: StaffAssignmentDto | null;
  users: StaffUserDto[];
}) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(initialOrder);
  const [assignment, setAssignment] = useState(initialAssignment);
  const [loading, setLoading] = useState(false);

  // Khách hàng của đơn + danh sách nhân viên cho dropdown phân công.
  const customer = users.find((u) => u.id === order.customerId) ?? null;
  const staffOptions = users.filter(isAssignableStaff);

  // Form states
  const [assignStaffId, setAssignStaffId] = useState("");
  const [platformOrderId, setPlatformOrderId] = useState("");
  const [placeNote, setPlaceNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [reassignStaffId, setReassignStaffId] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [volumeCm3, setVolumeCm3] = useState("");
  const [storageDays, setStorageDays] = useState("0");
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Lỗi validate inline theo từng field (key = tên field).
  const [errors, setErrors] = useState<Record<string, string>>({});
  const clearErr = (key: string) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));

  const actions = availableActions(order.status);

  async function callAction<T>(fn: () => Promise<{ data: T }>, successMsg: string) {
    setLoading(true);
    try {
      const res = await fn();
      setOrder(res.data as OrderDetailResponse);
      toast.success(successMsg);
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message ?? t("common.error");
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }

  // ── Validate + submit cho từng thao tác (chặn gọi API nếu có lỗi) ────────────
  function submitTracking() {
    const tn = trackingNumber.trim();
    const cr = trackingCarrier.trim();
    const e: Record<string, string> = {};
    if (!tn) e.trackingNumber = t("order.err_tracking_required");
    else if (tn.length < 4 || tn.length > 50) e.trackingNumber = t("order.err_tracking_length");
    if (!cr) e.trackingCarrier = t("order.err_carrier_required");
    else if (cr.length > 50) e.trackingCarrier = t("order.err_carrier_length");
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    callAction(
      () => manageOrdersApi.updateTracking(order.id, { trackingNumber: tn, carrier: cr }),
      t("order.tracking_success"),
    );
  }

  function submitManualPlace() {
    const pid = platformOrderId.trim();
    const e: Record<string, string> = {};
    if (!pid) e.platformOrderId = t("order.err_platform_required");
    else if (pid.length > 100) e.platformOrderId = t("order.err_platform_length");
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    callAction(
      () => manageOrdersApi.placeManual(order.id, { platformOrderId: pid, note: placeNote || undefined }),
      t("order.manual_place_success"),
    );
  }

  function submitArrivedVN() {
    const e: Record<string, string> = {};
    const w = parseFloat(weightKg);
    if (!weightKg.trim() || Number.isNaN(w) || w <= 0) e.weightKg = t("order.err_weight_required");
    else if (w > 1000) e.weightKg = t("order.err_weight_max");
    if (volumeCm3.trim()) {
      const v = parseFloat(volumeCm3);
      if (Number.isNaN(v) || v < 0) e.volumeCm3 = t("order.err_volume_invalid");
    }
    if (storageDays.trim()) {
      const s = Number(storageDays);
      if (!Number.isInteger(s) || s < 0) e.storageDays = t("order.err_storage_invalid");
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    callAction(
      () =>
        manageOrdersApi.arrivedVietnam(order.id, {
          actualWeightKg: w,
          volumeCm3: volumeCm3.trim() ? parseFloat(volumeCm3) : undefined,
          storageDaysOverFree: parseInt(storageDays) || 0,
          note: transitionNote || undefined,
        }),
      t("order.arrived_vn_success", "Đã ghi nhận hàng về kho VN và tính phí ship."),
    );
  }

  function submitRecordIssue() {
    const note = issueNote.trim();
    const e: Record<string, string> = {};
    if (note.length < 5) e.issueNote = t("order.err_issue_min");
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    callAction(() => manageOrdersApi.recordIssue(order.id, { issueNote: note }), t("order.issue_success"));
  }

  function submitCancel() {
    const reason = cancelReason.trim();
    const e: Record<string, string> = {};
    if (reason.length < 5) e.cancelReason = t("order.err_reason_min");
    setErrors(e);
    if (Object.values(e).some(Boolean)) return false;
    return true;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-slate-900">{order.orderCode}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {order.shopName}
            {order.placementMode && (
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {order.placementMode}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          {assignment && !assignment.completedAt && <SlaCountdown deadline={assignment.slaDeadline} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — Order details */}
        <div className="space-y-5 lg:col-span-2">
          {/* Customer info */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-1.5 font-heading text-sm font-semibold text-slate-800">
              <UserCircle size={18} weight="bold" />
              {t("order.customer_section", "Thông tin khách hàng")}
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="text-slate-500">{t("order.customer_name", "Họ tên")}</div>
              <div className="text-right font-medium text-slate-800">{customer?.fullName || "—"}</div>
              <div className="text-slate-500">Email</div>
              <div className="text-right">{customer?.email || "—"}</div>
              <div className="text-slate-500">{t("order.customer_phone", "Số điện thoại")}</div>
              <div className="flex items-center justify-end gap-1 text-right">
                {customer?.phone ? (
                  <>
                    <Phone size={13} weight="fill" className="text-slate-400" />
                    {customer.phone}
                  </>
                ) : (
                  "—"
                )}
              </div>
              {order.deliveryAddressNote && (
                <>
                  <div className="text-slate-500">{t("order.delivery_address", "Địa chỉ giao")}</div>
                  <div className="text-right text-slate-700">{order.deliveryAddressNote}</div>
                </>
              )}
              {order.customerNote && (
                <>
                  <div className="text-slate-500">{t("order.customer_note", "Ghi chú của khách")}</div>
                  <div className="text-right text-slate-700">{order.customerNote}</div>
                </>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-heading text-sm font-semibold text-slate-800">{t("order.info_title")}</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="text-slate-500">{t("order.total_cny")}</div>
              <div className="text-right font-medium tabular-nums">{formatCNY(order.totalCny)}</div>
              <div className="text-slate-500">
                {t("order.deposit_pct_label", { pct: (order.depositPct * 100).toFixed(0) })}
              </div>
              <div className={`flex items-center justify-end gap-1 text-right font-medium tabular-nums ${order.isDepositPaid ? "text-emerald-700" : "text-amber-600"}`}>
                {formatVND(order.depositVnd)}
                {order.isDepositPaid && <CheckCircle size={15} weight="fill" />}
              </div>
              <div className="text-slate-500">{t("order.final_payment", "Thanh toán cuối kỳ")}</div>
              <div className={`flex items-center justify-end gap-1 text-right font-medium tabular-nums ${order.isFinalPaid ? "text-emerald-700" : "text-slate-500"}`}>
                {formatVND(order.finalAmountVnd - order.depositVnd)}
                {order.isFinalPaid ? <CheckCircle size={15} weight="fill" /> : <span className="text-xs">{t("order.unpaid_short", "(chưa TT)")}</span>}
              </div>
              <div className="text-slate-500">{t("order.locked_rate")}</div>
              <div className="text-right font-mono tabular-nums">{order.rateVndPerCny.toLocaleString("vi-VN")} ₫/¥</div>
              <div className="text-slate-500">{t("common.created_at")}</div>
              <div className="text-right">{formatDate(order.createdAt)}</div>
              {order.assignedStaffId && (
                <>
                  <div className="text-slate-500">{t("order.staff_in_charge")}</div>
                  <div className="text-right font-medium text-slate-800">
                    {users.find((u) => u.id === order.assignedStaffId)?.fullName ??
                      `${order.assignedStaffId.slice(0, 8)}…`}
                  </div>
                </>
              )}
              {order.cancelReason && (
                <>
                  <div className="text-red-600">{t("order.cancel_reason_label")}</div>
                  <div className="text-right text-red-600">{order.cancelReason}</div>
                </>
              )}
            </div>

            {/* Fee breakdown */}
            {order.fees.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">{t("order.fee_breakdown", "Phân tích phí")}</p>
                <div className="space-y-1">
                  {order.fees.map((f) => (
                    <div key={f.feeType} className="flex justify-between text-xs text-slate-600">
                      <span>{feeLabel(f.feeType)}</span>
                      <span className="font-medium tabular-nums">{formatVND(f.amountVnd)}</span>
                    </div>
                  ))}
                  {order.shippingFeeVnd > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{t("order.intl_shipping_fee", "Phí ship quốc tế")}</span>
                      <span className="font-medium tabular-nums">{formatVND(order.shippingFeeVnd)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-xs font-bold text-slate-900">
                    <span>{t("order.grand_total", "Tổng đơn hàng")}</span>
                    <span className="tabular-nums">{formatVND(order.finalAmountVnd)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping info if recorded */}
            {order.actualWeightKg != null && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                  <Package size={15} weight="bold" />
                  {t("order.actual_shipping_info", "Thông tin vận chuyển thực tế")}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500">{t("order.weight", "Cân nặng")}:</span>
                  <span className="font-medium tabular-nums">{order.actualWeightKg} kg</span>
                  {order.volumeCm3 != null && (
                    <>
                      <span className="text-slate-500">{t("order.volume", "Thể tích")}:</span>
                      <span className="font-medium tabular-nums">{order.volumeCm3?.toLocaleString()} cm³</span>
                    </>
                  )}
                  {order.storageDaysOverFree > 0 && (
                    <>
                      <span className="text-slate-500">{t("order.storage_over", "Ngày lưu kho vượt")}:</span>
                      <span className="font-medium tabular-nums">{order.storageDaysOverFree} {t("order.days", "ngày")}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {order.staffNote && (
              <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                <span className="text-slate-500">{t("order.staff_note_label")}: </span>
                <span className="text-slate-700">{order.staffNote}</span>
              </div>
            )}
          </div>

          {/* Platform order */}
          {order.platformOrder && (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-heading text-sm font-semibold text-slate-800">{t("order.platform_section")}</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {order.platformOrder.platformOrderId && (
                  <>
                    <div className="text-slate-500">{t("order.platform_order_id_label")}</div>
                    <div className="text-right font-mono">{order.platformOrder.platformOrderId}</div>
                  </>
                )}
                {order.platformOrder.trackingNumber && (
                  <>
                    <div className="text-slate-500">{t("order.tracking_number_label")}</div>
                    <div className="text-right font-mono">
                      {order.platformOrder.trackingCarrier && (
                        <span className="mr-1 text-slate-400">{order.platformOrder.trackingCarrier}:</span>
                      )}
                      {order.platformOrder.trackingNumber}
                    </div>
                  </>
                )}
              </div>
              {order.platformOrder.hasIssue && (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-700">
                  <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
                  <span>{t("order.has_issue")}: {order.platformOrder.issueNote}</span>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
              <h2 className="font-heading text-sm font-semibold text-slate-800">
                {t("order.items_section", { count: order.items.length })}
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <Package size={18} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.productTitle}</p>
                    {item.variantName && <p className="text-xs text-slate-400">{item.variantName}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500 tabular-nums">{formatCNY(item.unitPriceCny)} × {item.quantity}</p>
                    <p className="text-sm font-semibold tabular-nums">{formatCNY(item.totalCny)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-heading text-sm font-semibold text-slate-800">{t("order.history_title_admin")}</h2>
            <OrderTimeline history={order.history} />
          </div>
        </div>

        {/* Right — Actions */}
        <div className="space-y-4">
          {/* Assign staff */}
          {actions.canAssign && (
            <ActionCard title={t("order.action_assign")}>
              <select
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                className="action-input"
              >
                <option value="">{t("order.select_staff", "— Chọn nhân viên —")}</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {staffLabel(s)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="mt-2 w-full"
                loading={loading}
                onClick={() => callAction(() => manageOrdersApi.assign(order.id, assignStaffId), t("order.assign_success"))}
                disabled={!assignStaffId.trim()}
              >
                {t("order.assign_btn")}
              </Button>
            </ActionCard>
          )}

          {/* Manual place */}
          {actions.canPlaceManual && (
            <ActionCard title={t("order.action_manual_place")}>
              <input
                value={platformOrderId}
                onChange={(e) => {
                  setPlatformOrderId(e.target.value);
                  clearErr("platformOrderId");
                }}
                placeholder={t("order.platform_id_placeholder")}
                className="action-input"
              />
              {errors.platformOrderId && <p className="mt-1 text-xs text-red-500">{errors.platformOrderId}</p>}
              <textarea
                value={placeNote}
                onChange={(e) => setPlaceNote(e.target.value)}
                placeholder={t("order.note_optional_placeholder")}
                rows={2}
                className="action-textarea mt-2"
              />
              <Button size="sm" className="mt-2 w-full" loading={loading} onClick={submitManualPlace}>
                {t("order.place_confirm_btn")}
              </Button>
            </ActionCard>
          )}

          {/* Update tracking */}
          {actions.canUpdateTracking && (
            <ActionCard title={t("order.action_update_tracking")}>
              <input
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  clearErr("trackingNumber");
                }}
                placeholder={t("order.tracking_placeholder")}
                className="action-input"
              />
              {errors.trackingNumber && <p className="mt-1 text-xs text-red-500">{errors.trackingNumber}</p>}
              <input
                value={trackingCarrier}
                onChange={(e) => {
                  setTrackingCarrier(e.target.value);
                  clearErr("trackingCarrier");
                }}
                placeholder={t("order.carrier_placeholder")}
                className="action-input mt-2"
              />
              {errors.trackingCarrier && <p className="mt-1 text-xs text-red-500">{errors.trackingCarrier}</p>}
              <Button size="sm" className="mt-2 w-full" loading={loading} onClick={submitTracking}>
                {t("order.save_tracking_btn")}
              </Button>
            </ActionCard>
          )}

          {/* Transition actions */}
          {(actions.canArrivedChina ||
            actions.canShippingToVN ||
            actions.canArrivedVN ||
            actions.canDelivering ||
            actions.canComplete ||
            actions.canReturn) && (
            <ActionCard title={t("order.action_transition")}>
              <textarea
                value={transitionNote}
                onChange={(e) => setTransitionNote(e.target.value)}
                placeholder={t("order.note_optional_placeholder")}
                rows={2}
                className="action-textarea mb-2"
              />

              {actions.canArrivedChina && (
                <TransitionBtn
                  label={t("order.transition_arrived_china")}
                  loading={loading}
                  onClick={() => callAction(() => manageOrdersApi.arrivedChina(order.id, { note: transitionNote || undefined }), t("order.arrived_china_success"))}
                />
              )}
              {actions.canShippingToVN && (
                <TransitionBtn
                  label={t("order.transition_shipping_to_vn")}
                  loading={loading}
                  onClick={() => callAction(() => manageOrdersApi.shippingToVN(order.id, { note: transitionNote || undefined }), t("order.shipping_to_vn_success"))}
                />
              )}
              {actions.canArrivedVN && (
                <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                    <Package size={15} weight="bold" />
                    {t("order.arrived_vn_form", "Nhập thông tin hàng về kho VN")}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-slate-500">{t("order.actual_weight_required", "Cân nặng thực (kg) *")}</label>
                      <input type="number" min="0" step="0.01" value={weightKg} onChange={(e) => { setWeightKg(e.target.value); clearErr("weightKg"); }} placeholder="VD: 1.5" className="action-input mt-0.5" />
                      {errors.weightKg && <p className="mt-1 text-xs text-red-500">{errors.weightKg}</p>}
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">{t("order.volume_optional", "Thể tích (cm³) — tuỳ chọn")}</label>
                      <input type="number" min="0" step="1" value={volumeCm3} onChange={(e) => { setVolumeCm3(e.target.value); clearErr("volumeCm3"); }} placeholder="VD: 3000" className="action-input mt-0.5" />
                      {errors.volumeCm3 && <p className="mt-1 text-xs text-red-500">{errors.volumeCm3}</p>}
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">{t("order.storage_days_over", "Ngày lưu kho vượt miễn phí")}</label>
                      <input type="number" min="0" step="1" value={storageDays} onChange={(e) => { setStorageDays(e.target.value); clearErr("storageDays"); }} className="action-input mt-0.5" />
                      {errors.storageDays && <p className="mt-1 text-xs text-red-500">{errors.storageDays}</p>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    loading={loading}
                    onClick={submitArrivedVN}
                  >
                    {t("order.arrived_vn_confirm", "Xác nhận hàng về kho VN")}
                  </Button>
                </div>
              )}
              {actions.canDelivering && (
                <TransitionBtn
                  label={t("order.transition_delivering")}
                  loading={loading}
                  onClick={() => callAction(() => manageOrdersApi.delivering(order.id, { note: transitionNote || undefined }), t("order.delivering_success"))}
                />
              )}
              {actions.canComplete && (
                <TransitionBtn
                  label={t("order.transition_complete")}
                  loading={loading}
                  onClick={() => callAction(() => manageOrdersApi.complete(order.id, { note: transitionNote || undefined }), t("order.complete_success"))}
                />
              )}
              {actions.canReturn && (
                <TransitionBtn
                  label={t("order.transition_return")}
                  loading={loading}
                  variant="secondary"
                  onClick={() => callAction(() => manageOrdersApi.markReturned(order.id, { note: transitionNote || undefined }), t("order.return_success"))}
                />
              )}
            </ActionCard>
          )}

          {/* Record issue */}
          {actions.canRecordIssue && (
            <ActionCard title={t("order.action_record_issue")}>
              <textarea
                value={issueNote}
                onChange={(e) => {
                  setIssueNote(e.target.value);
                  clearErr("issueNote");
                }}
                placeholder={t("order.issue_placeholder")}
                rows={3}
                className="action-textarea"
              />
              {errors.issueNote && <p className="mt-1 text-xs text-red-500">{errors.issueNote}</p>}
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 w-full"
                loading={loading}
                onClick={submitRecordIssue}
              >
                {t("order.action_record_issue")}
              </Button>
            </ActionCard>
          )}

          {/* Reassign staff */}
          {assignment && !assignment.completedAt && (
            <ActionCard title={t("order.action_reassign", "Chuyển nhân viên (Reassign)")}>
              <p className="mb-2 text-xs text-slate-500">
                {t("order.current_staff", "NV hiện tại")}:{" "}
                <span className="font-medium text-slate-700">
                  {users.find((u) => u.id === assignment.staffId)?.fullName ??
                    `${assignment.staffId.slice(0, 8)}…`}
                </span>
              </p>
              <select
                value={reassignStaffId}
                onChange={(e) => setReassignStaffId(e.target.value)}
                className="action-input"
              >
                <option value="">{t("order.select_new_staff", "— Chọn nhân viên mới —")}</option>
                {staffOptions
                  .filter((s) => s.id !== assignment?.staffId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {staffLabel(s)}
                    </option>
                  ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 w-full"
                loading={loading}
                onClick={async () => {
                  if (!reassignStaffId.trim()) return;
                  setLoading(true);
                  try {
                    const res = await staffAssignmentsApi.reassign(order.id, reassignStaffId.trim());
                    setAssignment(res.data as StaffAssignmentDto);
                    toast.success(t("order.reassign_success", "Đã chuyển nhân viên thành công."));
                    setReassignStaffId("");
                  } catch (err: unknown) {
                    const errMsg = (err as { message?: string })?.message ?? t("common.error");
                    toast.error(errMsg);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!reassignStaffId.trim()}
              >
                {t("order.reassign_confirm", "Xác nhận Reassign")}
              </Button>
            </ActionCard>
          )}

          {/* Cancel by staff */}
          {actions.canCancelByStaff && (
            <ActionCard title={t("order.action_cancel_staff")} danger>
              <input
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  clearErr("cancelReason");
                }}
                placeholder={t("order.cancel_reason_placeholder")}
                className="action-input"
              />
              {errors.cancelReason && <p className="mt-1 text-xs text-red-500">{errors.cancelReason}</p>}
              <Button
                variant="danger"
                size="sm"
                className="mt-2 w-full"
                loading={loading}
                onClick={() => {
                  if (submitCancel()) setIsCancelConfirmOpen(true);
                }}
              >
                {t("order.cancel_btn")}
              </Button>
            </ActionCard>
          )}
        </div>
      </div>

      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="space-y-3">
              <h4 className="flex items-center gap-1.5 font-heading text-base font-bold text-red-600">
                <WarningCircle size={20} weight="fill" />
                {t("order.cancel_confirm_title", "Xác nhận hủy đơn hàng")}
              </h4>
              <p className="text-xs leading-normal text-slate-600">
                {t("order.cancel_staff_confirm", "Bạn có chắc chắn muốn hủy đơn hàng này không? Lý do hủy sẽ được gửi cho khách hàng.")}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCancelConfirmOpen(false);
                  callAction(() => manageOrdersApi.cancelByStaff(order.id, { reason: cancelReason.trim() }), t("order.cancel_success"));
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t("order.cancel_confirm_btn", "Xác nhận hủy")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionCard({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${danger ? "border-red-200" : "border-slate-200/70"}`}
    >
      <h3 className={`mb-3 font-heading text-sm font-semibold ${danger ? "text-red-700" : "text-slate-800"}`}>
        {title}
      </h3>
      {children}

      <style>{`
        .action-input {
          width: 100%; font-size: 0.875rem;
          border: 1px solid #cbd5e1; border-radius: 0.5rem;
          padding: 0.375rem 0.75rem; background: white;
        }
        .action-input:focus { outline: none; box-shadow: 0 0 0 2px var(--color-primary); }
        .action-textarea {
          width: 100%; font-size: 0.875rem; resize: none;
          border: 1px solid #cbd5e1; border-radius: 0.5rem;
          padding: 0.375rem 0.75rem;
        }
        .action-textarea:focus { outline: none; box-shadow: 0 0 0 2px var(--color-primary); }
      `}</style>
    </div>
  );
}

function TransitionBtn({
  label,
  loading,
  onClick,
  variant = "primary",
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button variant={variant} size="sm" className="mb-2 w-full" loading={loading} onClick={onClick}>
      {label}
    </Button>
  );
}

function feeLabel(feeType: string): string {
  const labels: Record<string, string> = {
    ServiceFee: "Phí dịch vụ",
    InspectionFee: "Phí kiểm hàng",
    InsuranceFee: "Phí bảo hiểm",
    ShippingFee: "Phí vận chuyển",
  };
  return labels[feeType] ?? feeType;
}
