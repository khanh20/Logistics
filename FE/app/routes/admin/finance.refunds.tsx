import dayjs from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import { FiCheck, FiPlus, FiX, FiCopy } from "react-icons/fi";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import {
  REFUND_REASON_LABELS,
  REFUND_STATUS_COLORS,
  REFUND_STATUS_LABELS,
} from "~/lib/constants/finance";
import { RefundReasonEnum, RefundStatusEnum } from "~/lib/enums/finance";
import type { CreateRefundDto, RefundDto } from "~/lib/types/adminFinance";

function StatusBadge({ status }: { status: RefundStatusEnum }) {
  const label = REFUND_STATUS_LABELS[status] || "Không xác định";
  const color = REFUND_STATUS_COLORS[status] || "default";

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
        type="button"
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy ID"
      >
        {copied ? (
          <span className="text-[10px] text-green-600 font-sans font-semibold">Copied</span>
        ) : (
          <FiCopy className="text-xs" />
        )}
      </button>
    </div>
  );
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingRefundId, setRejectingRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Create form local state
  const [walletId, setWalletId] = useState("");
  const [referenceType, setReferenceType] = useState("Order");
  const [referenceId, setReferenceId] = useState("");
  const [grossAmountVnd, setGrossAmountVnd] = useState(0);
  const [penaltyPct, setPenaltyPct] = useState(0);
  const [reason, setReason] = useState<RefundReasonEnum>(RefundReasonEnum.Other);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await adminFinanceApi.getAllRefunds();
      if (res.success) {
        setRefunds(res.data || []);
      } else {
        setErrorMessage(res.message || "Lỗi khi tải danh sách hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Đã xảy ra lỗi khi tải danh sách hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId.trim() || !referenceId.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      const dto: CreateRefundDto = {
        walletId: walletId.trim(),
        referenceType: referenceType.trim(),
        referenceId: referenceId.trim(),
        grossAmountVnd,
        penaltyPct,
        reason,
      };
      const res = await adminFinanceApi.createRefund(dto);
      if (res.success) {
        setSuccessMessage("Tạo yêu cầu hoàn tiền thành công");
        setIsModalVisible(false);
        // Reset form
        setWalletId("");
        setReferenceType("Order");
        setReferenceId("");
        setGrossAmountVnd(0);
        setPenaltyPct(0);
        setReason(RefundReasonEnum.Other);
        fetchRefunds();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(res.message || "Lỗi khi tạo hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Đã xảy ra lỗi khi tạo hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này?")) return;
    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      const res = await adminFinanceApi.approveRefund(id);
      if (res.success) {
        setSuccessMessage("Duyệt hoàn tiền thành công");
        fetchRefunds();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(res.message || "Lỗi khi duyệt hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Đã xảy ra lỗi khi duyệt hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRefundId) return;
    if (!rejectReason.trim()) {
      setErrorMessage("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");
      const res = await adminFinanceApi.rejectRefund(rejectingRefundId, rejectReason.trim());
      if (res.success) {
        setSuccessMessage("Đã từ chối hoàn tiền");
        setRejectModalVisible(false);
        setRejectingRefundId(null);
        setRejectReason("");
        fetchRefunds();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setErrorMessage(res.message || "Lỗi khi từ chối hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Đã xảy ra lỗi khi từ chối hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const totalRefundAmount = useMemo(() => {
    return refunds
      .filter((r) => r.status === RefundStatusEnum.Completed)
      .reduce((acc, curr) => acc + curr.netRefundVnd, 0);
  }, [refunds]);

  const pendingRefundsCount = useMemo(() => {
    return refunds.filter((r) => r.status === RefundStatusEnum.Pending).length;
  }, [refunds]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý Hoàn tiền</h1>
          <p className="text-sm text-gray-500">Quản lý và xét duyệt các yêu cầu hoàn tiền của khách hàng</p>
        </div>
        <button
          onClick={() => setIsModalVisible(true)}
          className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4.5 py-2.5 rounded transition-colors"
        >
          <FiPlus />
          Tạo hoàn tiền
        </button>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Chờ duyệt</p>
          <h3 className="text-2xl font-serif font-bold text-amber-500">{pendingRefundsCount}</h3>
        </div>
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6">
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Tổng tiền đã hoàn</p>
          <h3 className="text-2xl font-serif font-bold text-green-600">{totalRefundAmount.toLocaleString()} ₫</h3>
        </div>
      </div>

      {/* Refunds Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && refunds.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã Ví</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tham chiếu</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Lý do</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày tạo</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {refunds.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <CopyableText text={record.walletId} />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-black">{record.referenceType}</span>
                        <CopyableText text={record.referenceId} />
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-gray-600">
                      {record.reason ? REFUND_REASON_LABELS[record.reason] : "—"}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5 text-right sm:text-left">
                        <span className="text-black">{record.grossAmountVnd.toLocaleString()} ₫</span>
                        {record.penaltyVnd > 0 && (
                          <span className="text-xs text-rose-500 font-medium">
                            Phạt: -{record.penaltyVnd.toLocaleString()} ₫ ({record.penaltyPct}%)
                          </span>
                        )}
                        <span className="font-semibold text-green-700 text-xs">
                          Thực: {record.netRefundVnd.toLocaleString()} ₫
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="py-3.5 px-6 text-gray-500">
                      {record.createdDate ? dayjs(record.createdDate).format("DD/MM/YYYY HH:mm") : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      {record.status === RefundStatusEnum.Pending ? (
                        <div className="inline-flex gap-2 justify-center">
                          <button
                            onClick={() => handleApprove(record.id)}
                            disabled={submitting}
                            className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white text-xs font-semibold p-1.5 rounded transition-colors disabled:opacity-50"
                            title="Duyệt hoàn tiền"
                          >
                            <FiCheck className="text-sm" />
                          </button>
                          <button
                            onClick={() => {
                              setRejectingRefundId(record.id);
                              setRejectModalVisible(true);
                            }}
                            disabled={submitting}
                            className="inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold p-1.5 rounded transition-colors disabled:opacity-50"
                            title="Từ chối hoàn tiền"
                          >
                            <FiX className="text-sm" />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      Không có yêu cầu hoàn tiền nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tạo hoàn tiền */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-xl w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">Tạo yêu cầu hoàn tiền</h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreateRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Mã ví khách hàng *
                </label>
                <input
                  type="text"
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  placeholder="Nhập mã ví (Wallet ID)..."
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Loại tham chiếu *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceType}
                    onChange={(e) => setReferenceType(e.target.value)}
                    placeholder="Ví dụ: Order..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Mã tham chiếu *
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Mã đơn hoặc mã giao dịch..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Số tiền hoàn (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={grossAmountVnd}
                    onChange={(e) => setGrossAmountVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Phần trăm phạt (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={penaltyPct}
                    onChange={(e) => setPenaltyPct(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Lý do hoàn tiền
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RefundReasonEnum)}
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white"
                >
                  {Object.entries(REFUND_REASON_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setIsModalVisible(false)}
                  className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ chối hoàn tiền */}
      {rejectModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Từ chối hoàn tiền</h3>
              <button
                onClick={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                  setRejectingRefundId(null);
                }}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleReject}>
              <div className="mb-4">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">
                  Lý do từ chối yêu cầu hoàn tiền này
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  className="w-full rounded border border-[#EAEAEA] p-3 text-sm text-black focus:border-black focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalVisible(false);
                    setRejectReason("");
                    setRejectingRefundId(null);
                  }}
                  className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
