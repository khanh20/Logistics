import { useState, useEffect } from "react";
import { redirect, Link } from "react-router";
import { toast } from "react-toastify";
import { store } from "~/lib/feature/store";
import { customerOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { OrderTimeline } from "~/components/customer/OrderTimeline";
import { ComplaintButton } from "~/components/customer/ComplaintButton";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { CUSTOMER_CANCELLABLE_STATUSES } from "~/lib/constants/orderStatus";
import type { OrderDetailResponse } from "~/lib/types/order";
import type { Route } from "./+types/orders.$id";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchMyWallet } from "~/lib/feature/finance/financeThunk";
import { selectWallet } from "~/lib/feature/finance/financeSelector";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết đơn hàng — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await customerOrdersApi.getDetail(params.id!);
  return { order: res.data as OrderDetailResponse };
}

// ── Countdown hook ─────────────────────────────────────────────────────────────
function useCountdown(targetIso: string | null) {
  const [remaining, setRemaining] = useState<number>(() =>
    targetIso ? Math.max(0, new Date(targetIso).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!targetIso) return;
    const tick = () =>
      setRemaining(Math.max(0, new Date(targetIso).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return { remaining, mins, secs };
}

export default function CustomerOrderDetailPage({
  loaderData,
}: {
  loaderData: { order: OrderDetailResponse };
}) {
  const [order, setOrder] = useState(loaderData.order);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"deposit" | "final" | null>(null);

  // Redux hooks & selectors
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet);

  // Custom visual state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "primary" | "warning";
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });

  // Helper trigger for custom confirm
  const requestConfirm = (options: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "primary" | "warning";
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || "Xác nhận",
      cancelText: options.cancelText || "Hủy",
      type: options.type || "primary",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        await options.onConfirm();
      },
    });
  };

  // Helper for gorgeous animated toast
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (type === "success") {
      toast.success(message);
    } else if (type === "error") {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  useEffect(() => {
    dispatch(fetchMyWallet());
  }, [dispatch]);

  // Deposit deadline: 30 min from createdAt if still PendingPayment and unpaid
  const depositDeadlineIso =
    order.status === "PendingPayment" && !order.isDepositPaid
      ? new Date(new Date(order.createdAt).getTime() + 30 * 60 * 1000).toISOString()
      : null;

  const { remaining: cdRemaining, mins: cdMins, secs: cdSecs } =
    useCountdown(depositDeadlineIso);

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(order.status);
  const canPayDeposit =
    order.status === "PendingPayment" && !order.isDepositPaid && cdRemaining > 0;
  const canPayFinal =
    order.status === "ArrivedVietnam" && order.isDepositPaid && !order.isFinalPaid;

  const paymentAmount = paymentType === "deposit" ? order.depositVnd : (order.finalAmountVnd - order.depositVnd);

  async function handlePayDeposit() {
    setPaymentType("deposit");
    setShowPaymentModal(true);
  }

  async function handlePayFinal() {
    setPaymentType("final");
    setShowPaymentModal(true);
  }

  async function executeWalletPayment() {
    setLoading(true);
    setError(null);
    setShowPaymentModal(false);
    try {
      let res;
      if (paymentType === "deposit") {
        res = await customerOrdersApi.payDeposit(order.id);
      } else {
        res = await customerOrdersApi.payFinal(order.id);
      }
      setOrder(res.data);
      showToast("Thanh toán thành công từ ví của bạn!", "success");
    } catch (err: unknown) {
      const errMsg = (err as { message?: string })?.message ?? "Thanh toán thất bại. Vui lòng thử lại.";
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      setError("Vui lòng nhập lý do hủy.");
      return;
    }

    requestConfirm({
      title: "Hủy đơn hàng",
      message: "Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.",
      type: "danger",
      confirmText: "Đồng ý hủy",
      cancelText: "Quay lại",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await customerOrdersApi.cancel(order.id, {
            reason: cancelReason.trim(),
          });
          setOrder(res.data);
          setShowCancelForm(false);
          showToast("Đã hủy đơn hàng thành công!", "success");
        } catch (err: unknown) {
          const errMsg = (err as { message?: string })?.message ?? "Hủy đơn thất bại.";
          showToast(errMsg, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  }

  const remainingPayment = order.finalAmountVnd - order.depositVnd;

  return (
    <div className="mx-auto max-w-4xl px-4 py-24 bg-white min-h-screen text-neutral-900">
      {/* Back */}
      <Link
        to="/orders"
        className="inline-flex items-center text-[10px] font-mono uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors mb-12"
      >
        <span className="mr-2">←</span> Danh sách đơn hàng
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 border-b border-[#EAEAEA] pb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">{order.shopName}</p>
          <h1 className="text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight leading-none mb-4">{order.orderCode}</h1>
          <div className="inline-flex">
            <StatusBadge status={order.status} />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {canPayDeposit && (
            <Button variant="primary" className="rounded bg-neutral-900 text-white hover:bg-neutral-800 border-none px-6" loading={loading} onClick={handlePayDeposit}>
              Đóng cọc
            </Button>
          )}
          {canPayFinal && (
            <Button variant="primary" className="rounded bg-neutral-900 text-white hover:bg-neutral-800 border-none px-6" loading={loading} onClick={handlePayFinal}>
              Thanh toán cuối
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" className="rounded border border-[#EAEAEA] bg-white text-neutral-600 hover:text-red-700 px-6" onClick={() => setShowCancelForm((v) => !v)}>
              Hủy đơn
            </Button>
          )}
          {order.isDepositPaid && <ComplaintButton order={order} />}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Deposit countdown banner */}
      {order.status === "PendingPayment" && !order.isDepositPaid && (
        <div
          className={`mb-5 rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 ${cdRemaining > 0
            ? "bg-amber-50 border-amber-200"
            : "bg-red-50 border-red-200"
            }`}
        >
          <div>
            <p
              className={`text-sm font-semibold ${cdRemaining > 0 ? "text-amber-800" : "text-red-800"
                }`}
            >
              {cdRemaining > 0
                ? "⏰ Vui lòng đóng cọc trong thời gian còn lại"
                : "🚫 Thời hạn đóng cọc đã hết"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {cdRemaining > 0
                ? "Đơn sẽ bị hủy tự động nếu không đóng cọc đúng hạn."
                : "Đơn hàng có thể sẽ bị hủy bởi hệ thống."}
            </p>
          </div>
          {cdRemaining > 0 && (
            <div className="shrink-0 text-center bg-white rounded-xl px-4 py-2 border border-amber-200 shadow-sm">
              <span className="text-2xl font-bold tabular-nums text-amber-700">
                {String(cdMins).padStart(2, "0")}:{String(cdSecs).padStart(2, "0")}
              </span>
              <p className="text-[10px] text-amber-500 mt-0.5">phút còn lại</p>
            </div>
          )}
        </div>
      )}

      {/* Pay final banner */}
      {canPayFinal && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">
            🎁 Hàng đã về kho VN — Thanh toán cuối kỳ để nhận hàng
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Số tiền còn lại cần thanh toán:{" "}
            <span className="font-bold text-emerald-700">{formatVND(remainingPayment)}</span>
          </p>
        </div>
      )}

      {/* Cancel form */}
      {showCancelForm && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
          <h3 className="text-sm font-semibold text-red-800 mb-3">Hủy đơn hàng</h3>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Lý do hủy đơn..."
            rows={3}
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
          />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCancelForm(false)}>
              Đóng
            </Button>
            <Button variant="danger" size="sm" loading={loading} onClick={handleCancel}>
              Xác nhận hủy
            </Button>
          </div>
        </div>
      )}

      {/* Payment summary */}
      <div className="bg-white rounded-lg border border-[#EAEAEA] p-8 md:p-10 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-8 pb-4 border-b border-[#EAEAEA]">Thông tin thanh toán</h2>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
          <div className="text-neutral-500">Giá trị hàng (CNY)</div>
          <div className="font-mono font-medium text-right text-neutral-900">{formatCNY(order.totalCny)}</div>

          <div className="text-neutral-500">Tỷ giá khoá</div>
          <div className="font-mono text-right text-neutral-900">
            {order.rateVndPerCny.toLocaleString("vi-VN")} ₫/¥
          </div>

          <div className="text-xs font-mono uppercase tracking-widest text-neutral-400 col-span-2 border-t border-[#EAEAEA] pt-6 mt-2">
            Các khoản phí
          </div>

          {order.fees.map((fee) => (
            <div key={fee.feeType} className="contents">
              <div className="text-neutral-500">· {feeLabel(fee.feeType)}</div>
              <div className="text-right font-mono text-neutral-900">{formatVND(fee.amountVnd)}</div>
            </div>
          ))}

          {order.shippingFeeVnd > 0 && (
            <div className="contents">
              <div className="text-neutral-500">· Phí ship quốc tế</div>
              <div className="text-right font-mono text-neutral-900">{formatVND(order.shippingFeeVnd)}</div>
            </div>
          )}

          <div className="text-neutral-900 font-serif text-lg border-t border-[#EAEAEA] pt-6 mt-2">
            Tổng giá trị đơn
          </div>
          <div className="font-mono text-lg font-semibold text-right border-t border-[#EAEAEA] pt-6 mt-2 text-neutral-900">
            {formatVND(order.finalAmountVnd)}
          </div>

          <div className="text-neutral-500">
            Tiền cọc ({(order.depositPct * 100).toFixed(0)}%)
          </div>
          <div className="font-mono text-right text-neutral-900">
            {formatVND(order.depositVnd)}
            <span className="text-[10px] uppercase ml-2 text-neutral-400">
              {order.isDepositPaid ? "Đã đóng" : "Chưa đóng"}
            </span>
          </div>

          {order.isDepositPaid && (
            <div className="contents">
              <div className="text-neutral-500">Còn lại</div>
              <div className="font-mono text-right text-neutral-900 font-medium">
                {formatVND(remainingPayment)}
                <span className="text-[10px] uppercase ml-2 text-neutral-400">
                  {order.isFinalPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Shipping info if available */}
        {order.actualWeightKg != null && (
          <div className="border border-[#EAEAEA] bg-[#FBFBFA] rounded-lg p-6 mt-8">
            <h4 className="text-xs font-mono uppercase tracking-widest text-neutral-900 mb-4">Thông tin vận chuyển thực tế</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <span className="text-neutral-500">Cân nặng:</span>
              <span className="font-mono text-right text-neutral-900">{order.actualWeightKg} kg</span>
              {order.volumeCm3 != null && (
                <>
                  <span className="text-neutral-500">Thể tích:</span>
                  <span className="font-mono text-right text-neutral-900">{order.volumeCm3?.toLocaleString()} cm³</span>
                </>
              )}
              {order.storageDaysOverFree > 0 && (
                <>
                  <span className="text-neutral-500">Ngày lưu kho vượt:</span>
                  <span className="font-mono text-right text-neutral-900">{order.storageDaysOverFree} ngày</span>
                </>
              )}
            </div>
          </div>
        )}

        {(order.deliveryAddressNote || order.customerNote) && (
          <div className="mt-8 pt-6 border-t border-[#EAEAEA] text-xs font-sans space-y-2 text-neutral-500">
            {order.deliveryAddressNote && (
              <p>
                <span className="font-mono uppercase tracking-wider text-neutral-400">Địa chỉ giao:</span>{" "}
                <span className="text-neutral-700">{order.deliveryAddressNote}</span>
              </p>
            )}
            {order.customerNote && (
              <p>
                <span className="font-mono uppercase tracking-wider text-neutral-400">Ghi chú:</span>{" "}
                <span className="text-neutral-700">{order.customerNote}</span>
              </p>
            )}
          </div>
        )}
        {order.cancelReason && (
          <div className="mt-6 border border-[#EAEAEA] bg-[#FDEBEC] rounded px-4 py-3 text-xs text-[#9F2F2D] font-mono">
            Lý do hủy: {order.cancelReason}
          </div>
        )}
      </div>

      {/* Tracking */}
      {order.platformOrder && (
        <div className="bg-white rounded-lg border border-[#EAEAEA] p-8 md:p-10 mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-8 pb-4 border-b border-[#EAEAEA]">Thông tin vận đơn</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
            {order.platformOrder.platformOrderId && (
              <>
                <div className="text-neutral-500">Mã đơn sàn</div>
                <div className="font-mono text-right text-neutral-900">{order.platformOrder.platformOrderId}</div>
              </>
            )}
            {order.platformOrder.trackingNumber && (
              <>
                <div className="text-neutral-500">Mã vận đơn</div>
                <div className="font-mono text-right text-neutral-900">
                  {order.platformOrder.trackingCarrier && (
                    <span className="text-neutral-400 mr-1.5">{order.platformOrder.trackingCarrier}</span>
                  )}
                  {order.platformOrder.trackingNumber}
                </div>
              </>
            )}
          </div>
          {order.platformOrder.hasIssue && order.platformOrder.issueNote && (
            <div className="mt-6 border border-[#EAEAEA] bg-[#FDEBEC] rounded px-4 py-3 text-xs text-[#9F2F2D] font-mono">
              Lưu ý sự cố: {order.platformOrder.issueNote}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-lg border border-[#EAEAEA] p-8 md:p-10 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-8 pb-4 border-b border-[#EAEAEA]">
          Sản phẩm ({order.items.length})
        </h2>
        <div className="divide-y divide-[#EAEAEA] -mx-8 md:-mx-10">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-5 px-8 md:px-10 py-5">
              <div className="w-16 h-16 rounded border border-[#EAEAEA] overflow-hidden bg-[#FBFBFA] shrink-0 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-mono text-neutral-400">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif text-neutral-900 truncate">{item.productTitle}</p>
                {item.variantName && (
                  <p className="text-xs font-mono text-neutral-400 mt-1">{item.variantName}</p>
                )}
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  {formatCNY(item.unitPriceCny)} × {item.quantity}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono font-semibold text-neutral-900">{formatCNY(item.totalCny)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-lg border border-[#EAEAEA] p-8 md:p-10 mb-8 text-sm">
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-8 pb-4 border-b border-[#EAEAEA]">Mốc thời gian</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <span className="text-neutral-500">Ngày tạo đơn</span>
          <span className="text-right font-mono text-neutral-900">{formatDate(order.createdAt)}</span>
          {order.paidAt && (
            <>
              <span className="text-neutral-500">Ngày đóng cọc</span>
              <span className="text-right font-mono text-neutral-900">{formatDate(order.paidAt)}</span>
            </>
          )}
          {order.completedAt && (
            <>
              <span className="text-neutral-500">Ngày hoàn thành</span>
              <span className="text-right font-mono text-neutral-900">{formatDate(order.completedAt)}</span>
            </>
          )}
          {order.cancelledAt && (
            <>
              <span className="text-[#9F2F2D]">Ngày hủy</span>
              <span className="text-right font-mono text-[#9F2F2D]">{formatDate(order.cancelledAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-[#EAEAEA] p-8 md:p-10 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-8 pb-4 border-b border-[#EAEAEA]">Lịch sử trạng thái</h2>
        <OrderTimeline history={order.history} />
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-[#EAEAEA] max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-[#EAEAEA] flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-widest text-neutral-900">
                THANH TOÁN ĐƠN HÀNG
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors font-mono text-xs uppercase tracking-wider"
              >
                Đóng
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 overflow-y-auto">
              {/* Order Info */}
              <div className="border border-[#EAEAEA] bg-[#FBFBFA] rounded p-4 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">MÃ ĐƠN HÀNG:</span>
                  <span className="font-semibold text-neutral-900">{order.orderCode}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-neutral-400">NỘI DUNG:</span>
                  <span className="font-semibold text-neutral-900">
                    {paymentType === "deposit" ? "Đóng cọc đơn hàng (65%)" : "Thanh toán cuối kỳ (Còn lại)"}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[#EAEAEA]">
                  <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">SỐ TIỀN CẦN THANH TOÁN:</span>
                  <span className="font-mono font-bold text-neutral-900">{formatVND(paymentAmount)}</span>
                </div>
              </div>

              {/* Wallet Detail */}
              <div className="space-y-4 pt-2">
                <div className="border border-[#EAEAEA] bg-[#FBFBFA] rounded p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Số dư khả dụng trong ví:</p>
                    <p className="text-base font-mono font-semibold text-neutral-900 mt-1">
                      {formatVND(wallet?.availableBalance || 0)}
                    </p>
                  </div>
                </div>

                {(wallet?.availableBalance || 0) < paymentAmount ? (
                  <div className="space-y-3">
                    <div className="border border-[#EAEAEA] bg-[#FDEBEC] rounded p-4 text-xs text-[#9F2F2D] font-mono">
                      Số dư khả dụng không đủ! Bạn cần nạp thêm ít nhất{" "}
                      <span className="font-bold">{formatVND(paymentAmount - (wallet?.availableBalance || 0))}</span>.
                    </div>
                    <Link
                      to="/finance"
                      target="_blank"
                      className="block w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-center text-xs font-mono uppercase tracking-wider transition-colors"
                    >
                      Nạp tiền vào ví ngay ↗
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={executeWalletPayment}
                    disabled={loading}
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-center text-xs font-mono uppercase tracking-wider transition-colors"
                  >
                    {loading ? "Đang xử lý..." : "Xác nhận thanh toán từ Ví"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[999] p-4">
          <div className="bg-white rounded-lg border border-[#EAEAEA] max-w-sm w-full p-8 space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-mono uppercase tracking-widest text-neutral-900">
                {confirmDialog.type === "danger" ? "Hủy đơn hàng" : "Xác nhận hành động"}
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-sans">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-white hover:bg-[#FBFBFA] text-neutral-600 text-xs font-mono uppercase tracking-wider rounded border border-[#EAEAEA] transition-colors"
              >
                {confirmDialog.cancelText || "Quay lại"}
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm()}
                className={`flex-1 py-2.5 text-white text-xs font-mono uppercase tracking-wider rounded transition-colors ${confirmDialog.type === "danger"
                    ? "bg-[#9F2F2D] hover:bg-[#852725]"
                    : "bg-neutral-900 hover:bg-neutral-800"
                  }`}
              >
                {confirmDialog.confirmText || "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
