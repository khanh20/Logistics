import React, { useState, useMemo } from "react";
import { PiMagnifyingGlassBold, PiLockOpenBold, PiXBold, PiCopyBold, PiCheckBold } from "react-icons/pi";
import dayjs from "dayjs";
import { financeApi } from "~/lib/api/finance";
import { PaymentLockStatusEnum, ReleaseReasonEnum } from "~/lib/enums/finance";
import {
  PAYMENT_LOCK_STATUS_COLORS,
  PAYMENT_LOCK_STATUS_LABELS,
  PAYMENT_LOCK_TYPE_LABELS,
  RELEASE_REASON_LABELS,
} from "~/lib/constants/finance";
import type { PaymentLockDto } from "~/lib/types/finance";

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1 group font-mono text-sm text-[#2F3437]">
      <span>{text.substring(0, 8)}...</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy ID"
      >
        {copied ? <PiCheckBold className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentLockStatusEnum }) {
  const label = PAYMENT_LOCK_STATUS_LABELS[status] || status;
  const color = PAYMENT_LOCK_STATUS_COLORS[status] || "default";

  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (color === "success") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (color === "processing" || color === "blue" || color === "cyan") {
    classes += "bg-blue-50 text-blue-700 border-blue-200/60";
  } else if (color === "warning") {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (color === "error") {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }

  return <span className={classes}>{label}</span>;
}

export default function AdminPaymentLocksPage() {
  const [orderId, setOrderId] = useState("");
  const [locks, setLocks] = useState<PaymentLockDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<PaymentLockDto | null>(null);
  const [releaseReason, setReleaseReason] = useState<ReleaseReasonEnum>(ReleaseReasonEnum.OrderCompleted);
  const [releasing, setReleasing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchPaymentLocksByOrder = async (searchOrderId: string) => {
    if (!searchOrderId.trim()) {
      setErrorMessage("Vui lòng nhập mã đơn hàng");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await financeApi.getPaymentLocksByOrder(searchOrderId.trim());
      if (res.data) {
        setLocks(res.data);
      } else {
        setLocks([]);
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Lỗi khi lấy dữ liệu khóa thanh toán");
      setLocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPaymentLocksByOrder(orderId);
  };

  const handleOpenReleaseModal = (lock: PaymentLockDto) => {
    setSelectedLock(lock);
    setReleaseReason(ReleaseReasonEnum.OrderCompleted);
    setIsModalOpen(true);
  };

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLock) return;
    setReleasing(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await financeApi.releasePaymentLock(selectedLock.id, releaseReason);
      setSuccessMessage("Giải phóng khóa thanh toán thành công");
      setIsModalOpen(false);
      fetchPaymentLocksByOrder(orderId);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error.message || "Lỗi khi giải phóng khóa thanh toán");
    } finally {
      setReleasing(false);
    }
  };

  const totalItems = locks.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedLocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return locks.slice(start, start + pageSize);
  }, [locks, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý Khóa Thanh Toán</h1>
        <p className="text-sm text-gray-500">Tìm kiếm và giải phóng các khoản tiền đang bị tạm khóa theo đơn hàng</p>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div className="mb-6 p-4 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 text-sm rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Search Bar & Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 shadow-sm mb-8">
        <form onSubmit={handleSearch} className="flex gap-3 mb-6 items-center">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
              <PiMagnifyingGlassBold className="text-sm" />
            </span>
            <input
              type="text"
              placeholder="Nhập mã đơn hàng..."
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full rounded border border-[#EAEAEA] bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-black focus:outline-none placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-5 py-2.5 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Đang tìm..." : "Tìm kiếm"}
          </button>
        </form>

        {loading && locks.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã Khóa</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã Đơn Hài</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Loại Khóa</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Hết hạn</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedLocks.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.id} />
                      </td>
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.orderId} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {PAYMENT_LOCK_TYPE_LABELS[record.type as keyof typeof PAYMENT_LOCK_TYPE_LABELS] || record.type}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-black">
                        {record.amount.toLocaleString()} ₫
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3.5 px-6 text-gray-500 font-mono text-xs">
                        {record.expiresAt ? dayjs(record.expiresAt).format("DD/MM/YYYY HH:mm") : "-"}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        {record.status === PaymentLockStatusEnum.Active && (
                          <button
                            onClick={() => handleOpenReleaseModal(record)}
                            className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
                          >
                            <PiLockOpenBold />
                            Giải phóng
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {locks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Vui lòng nhập mã đơn hàng để tra cứu khóa thanh toán.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAEAEA] bg-gray-50 text-xs">
                <span className="text-gray-500 font-medium">
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} dòng khóa
                </span>
                <div className="inline-flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-3 py-1.5 border border-[#EAEAEA] bg-white rounded text-black font-semibold hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    Trước
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3 py-1.5 border border-[#EAEAEA] bg-white rounded text-black font-semibold hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Giải phóng khóa thanh toán */}
      {isModalOpen && selectedLock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Giải phóng khóa thanh toán</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Lý do giải phóng *
                </label>
                <select
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value as ReleaseReasonEnum)}
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white font-medium"
                >
                  {Object.entries(RELEASE_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={releasing}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {releasing ? "Đang xử lý..." : "Xác nhận giải phóng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
