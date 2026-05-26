import { useState } from "react";
import { redirect, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { store } from "~/lib/feature/store";
import { customerOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { OrderTimeline } from "~/components/customer/OrderTimeline";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { CUSTOMER_CANCELLABLE_STATUSES } from "~/lib/constants/orderStatus";
import type { OrderDetailResponse } from "~/lib/types/order";
import type { Route } from "./+types/orders.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết đơn hàng — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await customerOrdersApi.getDetail(params.id!);
  return { order: res.data as OrderDetailResponse };
}

export default function CustomerOrderDetailPage({
  loaderData,
}: {
  loaderData: { order: OrderDetailResponse };
}) {
  const { t } = useTranslation();
  const [order, setOrder] = useState(loaderData.order);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  const canPayDeposit = order.status === "PendingPayment" && !order.isDepositPaid;

  async function handlePayDeposit() {
    if (!confirm(t("order.pay_deposit_confirm_msg"))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await customerOrdersApi.payDeposit(order.id);
      setOrder(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("order.pay_deposit_error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setError(t("order.cancel_reason_required"));
      return;
    }
    if (!confirm(t("order.cancel_confirm_msg"))) return;

    setLoading(true);
    setError(null);
    try {
      const res = await customerOrdersApi.cancel(order.id, {
        reason: cancelReason.trim(),
      });
      setOrder(res.data);
      setShowCancelForm(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("order.cancel_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        ← {t("order.back_to_list")}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.orderCode}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.shopName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {canPayDeposit && (
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handlePayDeposit}
            >
              {t("order.pay_deposit_btn")}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowCancelForm((v) => !v)}
            >
              {t("order.cancel_btn")}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Cancel form */}
      {showCancelForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-red-800 mb-3">{t("order.cancel_title")}</h3>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t("order.cancel_placeholder")}
            rows={3}
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCancelForm(false)}
            >
              {t("common.close")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={loading}
              onClick={handleCancel}
            >
              {t("order.cancel_confirm_btn")}
            </Button>
          </div>
        </div>
      )}

      {/* Pricing summary */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t("order.payment_info")}</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="text-gray-500">{t("order.total_cny")}</div>
          <div className="font-medium text-right">{formatCNY(order.totalCny)}</div>
          <div className="text-gray-500">{t("order.locked_rate")}</div>
          <div className="font-medium text-right">
            {order.rateVndPerCny.toLocaleString("vi-VN")} ₫/¥
          </div>
          <div className="text-gray-500">{t("order.total_vnd")}</div>
          <div className="font-medium text-right">{formatVND(order.finalAmountVnd)}</div>
          <div className="text-gray-500">
            {t("order.deposit_pct_label", { pct: (order.depositPct * 100).toFixed(0) })}
          </div>
          <div className={`font-semibold text-right ${order.isDepositPaid ? "text-green-700" : "text-amber-600"}`}>
            {formatVND(order.depositVnd)}
            {order.isDepositPaid ? " ✓" : ` (${t("order.unpaid")})`}
          </div>
        </div>

        {order.deliveryAddressNote && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">{t("order.address_label")}: </span>
            <span className="text-gray-700">{order.deliveryAddressNote}</span>
          </div>
        )}
        {order.customerNote && (
          <div className="mt-1 text-sm">
            <span className="text-gray-500">{t("order.note_label")}: </span>
            <span className="text-gray-700">{order.customerNote}</span>
          </div>
        )}
        {order.cancelReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-red-600">
            {t("order.cancel_reason_label")}: {order.cancelReason}
          </div>
        )}
      </div>

      {/* Tracking */}
      {order.platformOrder && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">{t("order.shipping_info")}</h2>
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
          {order.platformOrder.hasIssue && order.platformOrder.issueNote && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
              ⚠️ {order.platformOrder.issueNote}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            {t("order.items_section", { count: order.items.length })}
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                    📦
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.productTitle}
                </p>
                {item.variantName && (
                  <p className="text-xs text-gray-400">{item.variantName}</p>
                )}
                <p className="text-xs text-gray-400">
                  {formatCNY(item.unitPriceCny)} × {item.quantity}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">
                  {formatCNY(item.totalCny)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">{t("order.history_title")}</h2>
        <OrderTimeline history={order.history} />
      </div>
    </div>
  );
}
