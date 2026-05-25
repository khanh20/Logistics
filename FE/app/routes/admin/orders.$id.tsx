import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { manageOrdersApi, staffAssignmentsApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { OrderTimeline } from "~/components/customer/OrderTimeline";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import type { OrderDetailResponse, OrderStatus, StaffAssignmentDto } from "~/lib/types/order";
import type { Route } from "./+types/orders.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết đơn hàng — MuaHo Admin" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [orderRes, assignmentRes] = await Promise.allSettled([
    manageOrdersApi.getDetail(params.id!),
    staffAssignmentsApi.getActiveByOrder(params.id!),
  ]);
  const order = orderRes.status === "fulfilled" ? (orderRes.value.data as OrderDetailResponse) : null;
  if (!order) throw new Error("Không tải được đơn hàng.");
  const assignment = assignmentRes.status === "fulfilled"
    ? (assignmentRes.value.data as StaffAssignmentDto)
    : null;
  return { order, assignment };
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

export default function AdminOrderDetailPage({
  loaderData,
}: {
  loaderData: { order: OrderDetailResponse; assignment: StaffAssignmentDto | null };
}) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(loaderData.order);
  const [assignment, setAssignment] = useState(loaderData.assignment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const actions = availableActions(order.status);

  async function callAction<T>(fn: () => Promise<{ data: T }>, successMsg: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fn();
      setOrder(res.data as OrderDetailResponse);
      setSuccess(successMsg);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        ← {t("order.back_to_list")}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.orderCode}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {order.shopName}
            {order.placementMode && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {order.placementMode}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          {assignment && !assignment.completedAt && (
            <SlaCountdown deadline={assignment.slaDeadline} />
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          ✓ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Order details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">{t("order.info_title")}</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="text-gray-500">{t("order.total_cny")}</div>
              <div className="font-medium text-right">{formatCNY(order.totalCny)}</div>
              <div className="text-gray-500">
                {t("order.deposit_pct_label", { pct: (order.depositPct * 100).toFixed(0) })}
              </div>
              <div className={`font-medium text-right ${order.isDepositPaid ? "text-green-700" : "text-amber-600"}`}>
                {formatVND(order.depositVnd)}{order.isDepositPaid ? " ✓" : ""}
              </div>
              <div className="text-gray-500">{t("order.locked_rate")}</div>
              <div className="font-mono text-right">{order.rateVndPerCny.toLocaleString("vi-VN")} ₫/¥</div>
              <div className="text-gray-500">{t("common.created_at")}</div>
              <div className="text-right">{formatDate(order.createdAt)}</div>
              {order.assignedStaffId && (
                <>
                  <div className="text-gray-500">{t("order.staff_in_charge")}</div>
                  <div className="font-mono text-right text-xs">{order.assignedStaffId.slice(0, 16)}…</div>
                </>
              )}
              {order.cancelReason && (
                <>
                  <div className="text-gray-500 text-red-600">{t("order.cancel_reason_label")}</div>
                  <div className="text-right text-red-600">{order.cancelReason}</div>
                </>
              )}
            </div>
            {order.staffNote && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
                <span className="text-gray-500">{t("order.staff_note_label")}: </span>
                <span className="text-gray-700">{order.staffNote}</span>
              </div>
            )}
          </div>

          {/* Platform order */}
          {order.platformOrder && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">{t("order.platform_section")}</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {order.platformOrder.platformOrderId && (
                  <>
                    <div className="text-gray-500">{t("order.platform_order_id_label")}</div>
                    <div className="font-mono text-right">{order.platformOrder.platformOrderId}</div>
                  </>
                )}
                {order.platformOrder.trackingNumber && (
                  <>
                    <div className="text-gray-500">{t("order.tracking_number_label")}</div>
                    <div className="font-mono text-right">
                      {order.platformOrder.trackingCarrier && (
                        <span className="text-gray-400 mr-1">{order.platformOrder.trackingCarrier}:</span>
                      )}
                      {order.platformOrder.trackingNumber}
                    </div>
                  </>
                )}
              </div>
              {order.platformOrder.hasIssue && (
                <div className="mt-3 text-sm text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                  ⚠️ {t("order.has_issue")}: {order.platformOrder.issueNote}
                </div>
              )}
            </div>
          )}

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">
                {t("order.items_section", { count: order.items.length })}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productTitle}</p>
                    {item.variantName && (
                      <p className="text-xs text-gray-400">{item.variantName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{formatCNY(item.unitPriceCny)} × {item.quantity}</p>
                    <p className="text-sm font-semibold">{formatCNY(item.totalCny)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">{t("order.history_title_admin")}</h2>
            <OrderTimeline history={order.history} />
          </div>
        </div>

        {/* Right — Actions */}
        <div className="space-y-4">

          {/* Assign staff */}
          {actions.canAssign && (
            <ActionCard title={t("order.action_assign")}>
              <input
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
                placeholder={t("order.staff_id_placeholder")}
                className="action-input"
              />
              <Button
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={() =>
                  callAction(
                    () => manageOrdersApi.assign(order.id, assignStaffId),
                    t("order.assign_success")
                  )
                }
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
                onChange={(e) => setPlatformOrderId(e.target.value)}
                placeholder={t("order.platform_id_placeholder")}
                className="action-input"
              />
              <textarea
                value={placeNote}
                onChange={(e) => setPlaceNote(e.target.value)}
                placeholder={t("order.note_optional_placeholder")}
                rows={2}
                className="action-textarea mt-2"
              />
              <Button
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={() =>
                  callAction(
                    () =>
                      manageOrdersApi.placeManual(order.id, {
                        platformOrderId: platformOrderId.trim(),
                        note: placeNote || undefined,
                      }),
                    t("order.manual_place_success")
                  )
                }
                disabled={!platformOrderId.trim()}
              >
                {t("order.place_confirm_btn")}
              </Button>
            </ActionCard>
          )}

          {/* Update tracking */}
          {actions.canUpdateTracking && (
            <ActionCard title={t("order.action_update_tracking")}>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={t("order.tracking_placeholder")}
                className="action-input"
              />
              <input
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
                placeholder={t("order.carrier_placeholder")}
                className="action-input mt-2"
              />
              <Button
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={() =>
                  callAction(
                    () =>
                      manageOrdersApi.updateTracking(order.id, {
                        trackingNumber: trackingNumber.trim(),
                        carrier: trackingCarrier.trim(),
                      }),
                    t("order.tracking_success")
                  )
                }
                disabled={!trackingNumber.trim()}
              >
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
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.arrivedChina(order.id, { note: transitionNote || undefined }),
                      t("order.arrived_china_success")
                    )
                  }
                />
              )}
              {actions.canShippingToVN && (
                <TransitionBtn
                  label={t("order.transition_shipping_to_vn")}
                  loading={loading}
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.shippingToVN(order.id, { note: transitionNote || undefined }),
                      t("order.shipping_to_vn_success")
                    )
                  }
                />
              )}
              {actions.canArrivedVN && (
                <TransitionBtn
                  label={t("order.transition_arrived_vn")}
                  loading={loading}
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.arrivedVietnam(order.id, { note: transitionNote || undefined }),
                      t("order.arrived_vn_success")
                    )
                  }
                />
              )}
              {actions.canDelivering && (
                <TransitionBtn
                  label={t("order.transition_delivering")}
                  loading={loading}
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.delivering(order.id, { note: transitionNote || undefined }),
                      t("order.delivering_success")
                    )
                  }
                />
              )}
              {actions.canComplete && (
                <TransitionBtn
                  label={t("order.transition_complete")}
                  loading={loading}
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.complete(order.id, { note: transitionNote || undefined }),
                      t("order.complete_success")
                    )
                  }
                />
              )}
              {actions.canReturn && (
                <TransitionBtn
                  label={t("order.transition_return")}
                  loading={loading}
                  variant="secondary"
                  onClick={() =>
                    callAction(
                      () => manageOrdersApi.markReturned(order.id, { note: transitionNote || undefined }),
                      t("order.return_success")
                    )
                  }
                />
              )}
            </ActionCard>
          )}

          {/* Record issue */}
          {actions.canRecordIssue && (
            <ActionCard title={t("order.action_record_issue")}>
              <textarea
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder={t("order.issue_placeholder")}
                rows={3}
                className="action-textarea"
              />
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={() =>
                  callAction(
                    () => manageOrdersApi.recordIssue(order.id, { issueNote: issueNote.trim() }),
                    t("order.issue_success")
                  )
                }
                disabled={!issueNote.trim()}
              >
                {t("order.action_record_issue")}
              </Button>
            </ActionCard>
          )}

          {/* Reassign staff — hiển thị khi đơn đã được phân công */}
          {assignment && !assignment.completedAt && (
            <ActionCard title="Chuyển nhân viên (Reassign)">
              <p className="text-xs text-gray-500 mb-2">
                NV hiện tại:{" "}
                <span className="font-mono">{assignment.staffId.slice(0, 12)}…</span>
              </p>
              <input
                value={reassignStaffId}
                onChange={(e) => setReassignStaffId(e.target.value)}
                placeholder="Staff UUID mới"
                className="action-input"
              />
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={async () => {
                  if (!reassignStaffId.trim()) return;
                  setLoading(true);
                  setError(null);
                  try {
                    const res = await staffAssignmentsApi.reassign(
                      order.id,
                      reassignStaffId.trim()
                    );
                    setAssignment(res.data as StaffAssignmentDto);
                    setSuccess("Đã chuyển nhân viên thành công.");
                    setReassignStaffId("");
                  } catch (err: unknown) {
                    setError((err as { message?: string })?.message ?? t("common.error"));
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!reassignStaffId.trim()}
              >
                Xác nhận Reassign
              </Button>
            </ActionCard>
          )}

          {/* Cancel by staff */}
          {actions.canCancelByStaff && (
            <ActionCard title={t("order.action_cancel_staff")} danger>
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t("order.cancel_reason_placeholder")}
                className="action-input"
              />
              <Button
                variant="danger"
                size="sm"
                className="w-full mt-2"
                loading={loading}
                onClick={() => {
                  if (!confirm(t("order.cancel_staff_confirm"))) return;
                  callAction(
                    () => manageOrdersApi.cancelByStaff(order.id, { reason: cancelReason.trim() }),
                    t("order.cancel_success")
                  );
                }}
                disabled={!cancelReason.trim()}
              >
                {t("order.cancel_btn")}
              </Button>
            </ActionCard>
          )}
        </div>
      </div>
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
      className={`bg-white rounded-2xl border shadow-sm p-4 ${
        danger ? "border-red-200" : "border-gray-200"
      }`}
    >
      <h3
        className={`text-sm font-semibold mb-3 ${
          danger ? "text-red-700" : "text-gray-800"
        }`}
      >
        {title}
      </h3>
      {children}

      <style>{`
        .action-input {
          width: 100%; font-size: 0.875rem;
          border: 1px solid #d1d5db; border-radius: 0.5rem;
          padding: 0.375rem 0.75rem; background: white;
        }
        .action-input:focus { outline: none; box-shadow: 0 0 0 2px var(--color-primary); }
        .action-textarea {
          width: 100%; font-size: 0.875rem; resize: none;
          border: 1px solid #d1d5db; border-radius: 0.5rem;
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
    <Button
      variant={variant}
      size="sm"
      className="w-full mb-2"
      loading={loading}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
