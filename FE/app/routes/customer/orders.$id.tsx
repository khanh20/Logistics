import { useState, useEffect, useRef } from "react";
import { redirect, Link } from "react-router";
import { store } from "~/lib/feature/store";
import { customerOrdersApi } from "~/lib/api/orders";
import { financeApi } from "~/lib/api/finance";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { OrderTimeline } from "~/components/customer/OrderTimeline";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { CUSTOMER_CANCELLABLE_STATUSES } from "~/lib/constants/orderStatus";
import type { OrderDetailResponse } from "~/lib/types/order";
import type { Route } from "./+types/orders.$id";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchMyWallet, fetchSystemBankAccounts, submitTopup, createZaloPayPayment } from "~/lib/feature/finance/financeThunk";
import { selectWallet, selectSystemBankAccounts } from "~/lib/feature/finance/financeSelector";

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

  // Redux hooks & selectors
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet);
  const systemBankAccounts = useAppSelector(selectSystemBankAccounts) || [];

  // Custom visual state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
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
    onConfirm: () => {},
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"deposit" | "final" | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"wallet" | "zalopay">("wallet");
  const [topupLoading, setTopupLoading] = useState(false);

  const [pollingTopupId, setPollingTopupId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "success" | "error" | "timeout">("idle");
  const pollingIntervalRef = useRef<any>(null);
  const pollCountRef = useRef<number>(0);

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
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    dispatch(fetchMyWallet());
    dispatch(fetchSystemBankAccounts());
  }, [dispatch]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);  // Deposit deadline: 30 min from createdAt if still PendingPayment and unpaid
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
    setSelectedMethod("wallet");
    setShowPaymentModal(true);
  }

  async function handlePayFinal() {
    setPaymentType("final");
    setSelectedMethod("wallet");
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



  // Trình tự hủy bỏ và dọn dẹp polling
  function cancelPolling() {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollingTopupId(null);
    setPollingStatus("idle");
  }

  // Hàm thực hiện kiểm tra trạng thái topup và thanh toán đơn hàng tương ứng
  async function checkTopupStatusManual() {
    if (!pollingTopupId) return;
    await performPollCheck(pollingTopupId);
  }

  async function performPollCheck(topupId: string) {
    try {
      const response = await financeApi.getMyTopups();
      if (response && response.success && Array.isArray(response.data)) {
        const targetTopup = response.data.find((t: any) => t.id === topupId);
        if (targetTopup) {
          // status = 2 (Matched) nghĩa là nạp tiền thành công
          if (targetTopup.status === 2) {
            // Dừng polling ngay lập tức
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Chuyển status sang success
            setPollingStatus("success");

            // Tự động gọi API trừ tiền ví để thanh toán đơn hàng
            try {
              let res;
              if (paymentType === "deposit") {
                res = await customerOrdersApi.payDeposit(order.id);
              } else {
                res = await customerOrdersApi.payFinal(order.id);
              }

              if (res && res.success) {
                showToast(
                  paymentType === "deposit"
                    ? "Đã tự động xác nhận đặt cọc 65% đơn hàng thành công!"
                    : "Đã tự động xác nhận thanh toán phần còn lại thành công!",
                  "success"
                );
                // Cập nhật lại thông tin đơn hàng
                if (res.data) {
                  setOrder(res.data);
                }
                // Đồng bộ lại ví
                dispatch(fetchMyWallet());
              } else {
                showToast("Nạp tiền thành công nhưng thanh toán đơn hàng gặp lỗi. Bạn có thể thanh toán bằng ví thủ công.", "error");
                setPollingStatus("error");
              }
            } catch (payErr: any) {
              showToast(payErr || "Nạp tiền thành công nhưng thanh toán đơn hàng gặp lỗi. Vui lòng thanh toán bằng số dư ví.", "error");
              setPollingStatus("error");
            }
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra trạng thái thanh toán ZaloPay:", err);
    }
  }

  function startPolling(topupId: string) {
    // Dọn dẹp polling cũ nếu có
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setPollingTopupId(topupId);
    setPollingStatus("polling");
    pollCountRef.current = 0;

    pollingIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      // Giới hạn 150 lần check (tương đương 5 phút)
      if (pollCountRef.current > 150) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setPollingStatus("timeout");
        showToast("Hết thời gian chờ thanh toán ZaloPay.", "error");
        return;
      }
      await performPollCheck(topupId);
    }, 2000);
  }

  async function handleZaloPayCheckout() {
    setTopupLoading(true);
    try {
      const activeAccounts = systemBankAccounts.filter((b) => b.isActive);
      const selectedAccount = activeAccounts[0] || { id: "" };

      const noteStr = paymentType === "deposit"
        ? `Dong coc 65% don hang ${order.orderCode}`
        : `Thanh toan 35% con lai don hang ${order.orderCode}`;

      // 1. Tạo TopupRequest với note mô tả thanh toán đơn hàng cụ thể
      const topupRes = await dispatch(
        submitTopup({
          amount: paymentAmount,
          bankAccountId: selectedAccount.id || "",
          note: noteStr,
        })
      ).unwrap();

      // 2. Gọi API khởi tạo cổng thanh toán ZaloPay
      const payRes = await dispatch(createZaloPayPayment(topupRes.id)).unwrap();

      if (payRes && payRes.payUrl) {
        window.open(payRes.payUrl, "_blank");
        showToast("Đã mở trang thanh toán ZaloPay Sandbox. Vui lòng thanh toán!", "success");
        // Bắt đầu tự động kiểm tra trạng thái thanh toán
        startPolling(topupRes.id);
      } else {
        showToast("Không nhận được phản hồi URL từ ZaloPay.", "error");
      }
    } catch (err: any) {
      showToast(err || "Lỗi khởi tạo cổng ZaloPay. Vui lòng thử lại.", "error");
    } finally {
      setTopupLoading(false);
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
      >
        ← Quay lại danh sách đơn
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.orderCode}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{order.shopName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={order.status} />
          {canPayDeposit && (
            <Button variant="primary" size="sm" loading={loading} onClick={handlePayDeposit}>
              💳 Đóng cọc
            </Button>
          )}
          {canPayFinal && (
            <Button variant="primary" size="sm" loading={loading} onClick={handlePayFinal}>
              ✅ Thanh toán cuối kỳ
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setShowCancelForm((v) => !v)}>
              Hủy đơn
            </Button>
          )}
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">💰 Thông tin thanh toán</h2>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
          <div className="text-gray-500">Giá trị hàng (CNY)</div>
          <div className="font-medium text-right">{formatCNY(order.totalCny)}</div>

          <div className="text-gray-500">Tỷ giá khoá</div>
          <div className="font-medium text-right">
            {order.rateVndPerCny.toLocaleString("vi-VN")} ₫/¥
          </div>

          <div className="text-gray-500 col-span-2 border-t border-gray-100 pt-2 mt-1 font-medium text-gray-700">
            Các khoản phí
          </div>

          {order.fees.map((fee) => (
            <div key={fee.feeType} className="contents">
              <div className="text-gray-500 pl-2">· {feeLabel(fee.feeType)}</div>
              <div className="text-right text-gray-700">{formatVND(fee.amountVnd)}</div>
            </div>
          ))}

          {order.shippingFeeVnd > 0 && (
            <>
              <div className="text-gray-500 pl-2">· Phí ship quốc tế</div>
              <div className="text-right text-gray-700">{formatVND(order.shippingFeeVnd)}</div>
            </>
          )}

          <div className="text-gray-800 font-semibold border-t border-gray-100 pt-2 mt-1">
            Tổng giá trị đơn
          </div>
          <div className="font-bold text-right border-t border-gray-100 pt-2 mt-1">
            {formatVND(order.finalAmountVnd)}
          </div>

          <div className="text-gray-500">
            Tiền cọc ({(order.depositPct * 100).toFixed(0)}%)
          </div>
          <div
            className={`font-semibold text-right ${order.isDepositPaid ? "text-green-700" : "text-amber-600"
              }`}
          >
            {formatVND(order.depositVnd)}
            {order.isDepositPaid ? " ✓" : " (chưa đóng)"}
          </div>

          {order.isDepositPaid && (
            <>
              <div className="text-gray-500">Còn lại</div>
              <div
                className={`font-semibold text-right ${order.isFinalPaid ? "text-green-700" : "text-primary"
                  }`}
              >
                {formatVND(remainingPayment)}
                {order.isFinalPaid ? " ✓" : " (chưa thanh toán)"}
              </div>
            </>
          )}
        </div>

        {/* Shipping info if available */}
        {order.actualWeightKg != null && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold text-blue-900 mb-1">📦 Thông tin vận chuyển thực tế</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-blue-600">Cân nặng:</span>
              <span className="font-medium">{order.actualWeightKg} kg</span>
              {order.volumeCm3 != null && (
                <>
                  <span className="text-blue-600">Thể tích:</span>
                  <span className="font-medium">{order.volumeCm3?.toLocaleString()} cm³</span>
                </>
              )}
              {order.storageDaysOverFree > 0 && (
                <>
                  <span className="text-blue-600">Ngày lưu kho vượt:</span>
                  <span className="font-medium">{order.storageDaysOverFree} ngày</span>
                </>
              )}
            </div>
          </div>
        )}

        {order.deliveryAddressNote && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Địa chỉ giao: </span>
            <span className="text-gray-700">{order.deliveryAddressNote}</span>
          </div>
        )}
        {order.customerNote && (
          <div className="mt-1 text-sm">
            <span className="text-gray-500">Ghi chú: </span>
            <span className="text-gray-700">{order.customerNote}</span>
          </div>
        )}
        {order.cancelReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-red-600">
            Lý do hủy: {order.cancelReason}
          </div>
        )}
      </div>

      {/* Tracking */}
      {order.platformOrder && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">🚚 Thông tin vận đơn</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {order.platformOrder.platformOrderId && (
              <>
                <div className="text-gray-500">Mã đơn sàn</div>
                <div className="font-mono text-right">{order.platformOrder.platformOrderId}</div>
              </>
            )}
            {order.platformOrder.trackingNumber && (
              <>
                <div className="text-gray-500">Mã vận đơn</div>
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
            Sản phẩm ({order.items.length})
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
                <p className="text-sm font-medium text-gray-800 truncate">{item.productTitle}</p>
                {item.variantName && (
                  <p className="text-xs text-gray-400">{item.variantName}</p>
                )}
                <p className="text-xs text-gray-400">
                  {formatCNY(item.unitPriceCny)} × {item.quantity}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatCNY(item.totalCny)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5 text-sm">
        <h2 className="font-semibold text-gray-800 mb-3">🗓 Mốc thời gian</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <span className="text-gray-500">Ngày tạo đơn</span>
          <span className="text-right">{formatDate(order.createdAt)}</span>
          {order.paidAt && (
            <>
              <span className="text-gray-500">Ngày đóng cọc</span>
              <span className="text-right">{formatDate(order.paidAt)}</span>
            </>
          )}
          {order.completedAt && (
            <>
              <span className="text-gray-500">Ngày hoàn thành</span>
              <span className="text-right">{formatDate(order.completedAt)}</span>
            </>
          )}
          {order.cancelledAt && (
            <>
              <span className="text-gray-500 text-red-500">Ngày hủy</span>
              <span className="text-right text-red-600">{formatDate(order.cancelledAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">📋 Lịch sử trạng thái</h2>
        <OrderTimeline history={order.history} />
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>💰 {pollingStatus === "polling" ? "Đang chờ thanh toán ZaloPay" : pollingStatus === "success" ? "Thanh toán thành công" : "Thanh toán đơn hàng"}</span>
              </h3>
              <button
                onClick={() => { cancelPolling(); setShowPaymentModal(false); }}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {pollingStatus === "polling" ? (
                <div className="text-center py-8 space-y-6 flex flex-col items-center">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-600 text-3xl">🌀</div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-sm">Vui lòng hoàn tất thanh toán ở tab mới mở</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                      Hệ thống đang kiểm tra tự động trạng thái thanh toán từ ZaloPay.
                      Vui lòng không đóng cửa sổ này cho đến khi nhận được thông báo thành công.
                    </p>
                  </div>

                  <div className="bg-emerald-50 text-emerald-800 rounded-2xl p-4 text-xs font-medium w-full text-left">
                    📌 <strong>Nội dung:</strong> {paymentType === "deposit" ? `Đóng cọc 65% đơn hàng ${order.orderCode}` : `Thanh toán 35% còn lại đơn hàng ${order.orderCode}`}
                    <br />
                    💵 <strong>Số tiền:</strong> {formatVND(paymentAmount)}
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={cancelPolling}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-semibold transition-colors"
                    >
                      Đóng / Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={checkTopupStatusManual}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/10 transition-colors"
                    >
                      Kiểm tra ngay 🔄
                    </button>
                  </div>
                </div>
              ) : pollingStatus === "success" ? (
                <div className="text-center py-8 space-y-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl animate-bounce">
                    ✓
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-sm">🎉 Thanh toán đơn hàng thành công!</h4>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Đơn hàng {order.orderCode} đã được ghi nhận thanh toán hoàn tất thông qua ZaloPay.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPollingStatus("idle");
                      setPollingTopupId(null);
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-colors"
                  >
                    Xác nhận và đóng
                  </button>
                </div>
              ) : pollingStatus === "error" || pollingStatus === "timeout" ? (
                <div className="text-center py-8 space-y-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl">
                    ⚠️
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-900 text-sm">Chưa nhận được xác nhận từ ZaloPay</h4>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Nếu bạn đã thanh toán thành công qua ZaloPay, tiền có thể cần 1-2 phút để cộng vào ví. 
                      Bạn có thể thử kiểm tra lại thủ công hoặc đóng cửa sổ này.
                    </p>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaymentModal(false);
                        setPollingStatus("idle");
                        setPollingTopupId(null);
                      }}
                      className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-semibold transition-colors"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={checkTopupStatusManual}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-colors"
                    >
                      Thử lại 🔄
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Order Info */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Mã đơn hàng:</span>
                      <span className="font-semibold text-gray-700">{order.orderCode}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Nội dung thanh toán:</span>
                      <span className="font-semibold text-gray-700">
                        {paymentType === "deposit" ? "Đóng cọc đơn hàng (65%)" : "Thanh toán cuối kỳ (Còn lại)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200/60">
                      <span className="font-medium text-gray-900">Số tiền cần thanh:</span>
                      <span className="text-lg font-bold text-blue-600">{formatVND(paymentAmount)}</span>
                    </div>
                  </div>

                  {/* Method Selector */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Chọn phương thức thanh toán
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Wallet Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("wallet")}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                          selectedMethod === "wallet"
                            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">💳</span>
                          {selectedMethod === "wallet" && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Ví điện tử</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Số dư khả dụng</p>
                        </div>
                      </button>

                      {/* ZaloPay Option */}
                      <button
                        type="button"
                        onClick={() => setSelectedMethod("zalopay")}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                          selectedMethod === "zalopay"
                            ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">🌀</span>
                          {selectedMethod === "zalopay" && (
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Cổng ZaloPay</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">App, Thẻ, QR Pay</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Method Detail View */}
                  {selectedMethod === "wallet" && (
                    /* WALLET DETAIL */
                    <div className="space-y-4 pt-2">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-700">Số dư khả dụng trong ví:</p>
                          <p className="text-base font-extrabold text-blue-900 mt-0.5">
                            {formatVND(wallet?.availableBalance || 0)}
                          </p>
                        </div>
                        <span className="text-2xl">💰</span>
                      </div>

                      {(wallet?.availableBalance || 0) < paymentAmount ? (
                        <div className="space-y-3">
                          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-700">
                            ⚠️ <strong>Số dư khả dụng không đủ!</strong> Bạn cần nạp thêm ít nhất{" "}
                            <span className="font-bold">{formatVND(paymentAmount - (wallet?.availableBalance || 0))}</span> để thực hiện giao dịch này.
                          </div>
                          <Link
                            to="/finance"
                            target="_blank"
                            className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-center text-xs font-semibold shadow-lg shadow-red-600/10 transition-colors"
                          >
                            Nạp tiền vào ví ngay ↗
                          </Link>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={executeWalletPayment}
                          disabled={loading}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-center text-xs font-bold shadow-lg shadow-blue-600/10 transition-all active:scale-[0.98]"
                        >
                          {loading ? "Đang xử lý..." : "Xác nhận thanh toán từ Ví"}
                        </button>
                      )}
                    </div>
                  )}

                  {selectedMethod === "zalopay" && (
                    /* ZALOPAY DETAIL */
                    <div className="space-y-4 pt-2 text-center flex flex-col items-center">
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 w-full text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-emerald-800 font-semibold">⚡ Cổng thanh toán ZaloPay</span>
                          <span className="text-lg">🌀</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Hệ thống sẽ mở trang thanh toán của **ZaloPay**. Bạn có thể dùng ứng dụng **ZaloPay** để quét mã QR thanh toán hoặc sử dụng thẻ ATM, thẻ quốc tế ngay trên trình duyệt.
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 w-full text-xs space-y-1.5 text-left">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Số tiền:</span>
                          <span className="font-bold text-gray-800">{formatVND(paymentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Trạng thái cổng:</span>
                          <span className="font-medium text-emerald-600">Sẵn sàng kết nối 🟢</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleZaloPayCheckout}
                        disabled={topupLoading}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-center text-xs font-bold shadow-lg shadow-emerald-600/10 transition-all active:scale-[0.98]"
                      >
                        {topupLoading ? "Đang kết nối ZaloPay..." : "🚀 Tiến hành thanh toán qua ZaloPay"}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[999] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 space-y-5 transform transition-all animate-scale-up">
            <div className="space-y-2.5">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {confirmDialog.type === "danger" ? "⚠️ Hủy đơn hàng" : "❓ Xác nhận hành động"}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors"
              >
                {confirmDialog.cancelText || "Quay lại"}
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm()}
                className={`flex-1 py-2.5 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors ${
                  confirmDialog.type === "danger"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/10"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/10"
                }`}
              >
                {confirmDialog.confirmText || "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gorgeous Success/Error Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-slide-in-right">
          <span
            className={`text-sm w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === "success"
                ? "bg-green-50 text-green-600"
                : toast.type === "error"
                ? "bg-red-50 text-red-600"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900">
              {toast.type === "success" ? "Thành công" : toast.type === "error" ? "Lỗi" : "Thông báo"}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{toast.message}</p>
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
