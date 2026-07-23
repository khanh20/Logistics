import { normalizeError } from "~/lib/utils/errors";
import React, { useState, useMemo } from "react";
import { financeApi } from "~/lib/api/finance";
import { manageOrdersApi } from "~/lib/api/orders";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { PaymentLockStatusEnum, ReleaseReasonEnum } from "~/lib/enums/finance";
import {
  PAYMENT_LOCK_STATUS_COLORS,
  PAYMENT_LOCK_STATUS_LABELS,
  PAYMENT_LOCK_TYPE_LABELS,
  RELEASE_REASON_LABELS,
} from "~/lib/constants/finance";
import type { PaymentLockDto } from "~/lib/types/finance";
import dayjs from "dayjs";
import { Pagination } from "~/components/ui/Pagination";
import { Check, Copy, LockOpen, MagnifyingGlass, Warning, X } from "~/components/shared/icons";

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
        {copied ? <Check className="text-green-600 text-xs" /> : <Copy className="text-xs" />}
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locks, setLocks] = useState<PaymentLockDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<PaymentLockDto | null>(null);
  const [releaseReason, setReleaseReason] = useState<ReleaseReasonEnum>(ReleaseReasonEnum.OrderCompleted);
  const [releasing, setReleasing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchPaymentLocks = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      let finalOrderId = orderId.trim();
      const statusParam = statusFilter !== "all" ? Number(statusFilter) : undefined;
      
      if (finalOrderId) {
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalOrderId);
        if (!isGuid) {
          try {
            const orderRes = await manageOrdersApi.getByCode(finalOrderId);
            if (orderRes.data?.id) {
              finalOrderId = orderRes.data.id;
            } else {
              throw new Error("Không tìm thấy đơn hàng với mã này");
            }
          } catch (err: unknown) {
            throw new Error(normalizeError(err).message || normalizeError(err).message || "Lỗi khi tra cứu mã đơn hàng");
          }
        }
      }

      const res = await financeApi.searchPaymentLocks({
        status: statusParam,
        orderId: finalOrderId || undefined,
        page: currentPage,
        pageSize: pageSize
      });

      if (res.data) {
        setLocks(res.data.items || []);
        setTotalCount(res.data.total || 0);
      } else {
        setLocks([]);
        setTotalCount(0);
      }
    } catch (error: unknown) {
      setErrorMessage(normalizeError(error).message || "Lỗi khi lấy dữ liệu khóa thanh toán");
      setLocks([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPaymentLocks();
  }, [currentPage, pageSize, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchPaymentLocks();
    }
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
      fetchPaymentLocks();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: unknown) {
      setErrorMessage(normalizeError(error).message || "Lỗi khi giải phóng khóa thanh toán");
    } finally {
      setReleasing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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
        <form onSubmit={handleSearch} className="flex gap-3 mb-6 items-end">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none mt-[0.15rem]">
              <MagnifyingGlass className="text-sm" />
            </span>
            <Input
              type="text"
              placeholder="Nhập mã đơn hàng..."
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48 mb-0"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(PAYMENT_LOCK_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </Select>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
          >
            Tìm kiếm
          </Button>
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
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã Đơn Hàng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Loại Khóa</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Hết hạn</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {locks.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.id} />
                      </td>
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.orderId} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {PAYMENT_LOCK_TYPE_LABELS[record.lockType as keyof typeof PAYMENT_LOCK_TYPE_LABELS] || record.lockType}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-black">
                        {record.lockedAmountVnd?.toLocaleString()} ₫
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
                            <LockOpen />
                            Giải phóng
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {locks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Không tìm thấy khoản tiền tạm giữ nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="dòng khóa"
            />
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
                <X className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="space-y-4">
              <div>
                <Select
                  label="Lý do giải phóng *"
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value as ReleaseReasonEnum)}
                >
                  {Object.entries(RELEASE_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={releasing}
                  loading={releasing}
                >
                  Xác nhận giải phóng
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
