import dayjs from "dayjs";
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { FiCheck, FiPlus, FiX, FiCopy } from "react-icons/fi";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import { Button } from "~/components/ui/Button";
import { Select } from "~/components/ui/Select";
import {
  REFUND_REASON_LABELS,
  REFUND_STATUS_COLORS,
  REFUND_STATUS_LABELS,
} from "~/lib/constants/finance";
import { RefundReasonEnum, RefundStatusEnum } from "~/lib/enums/finance";
import type { CreateRefundDto, RefundDto } from "~/lib/types/adminFinance";
import { Copy, Wallet, Warning, WarningCircle, X } from "~/components/shared/icons";

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
  const [approvingRefundId, setApprovingRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Create form local state
  const [walletId, setWalletId] = useState("");
  const [referenceType, setReferenceType] = useState("Order");
  const [referenceId, setReferenceId] = useState("");
  const [grossAmountVnd, setGrossAmountVnd] = useState(0);
  const [penaltyPct, setPenaltyPct] = useState(0);
  const [reason, setReason] = useState<RefundReasonEnum>(RefundReasonEnum.Other);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await adminFinanceApi.getAllRefunds();
      if (res.success) {
        setRefunds(res.data || []);
      } else {
        toast.error(res.message || "Lỗi khi tải danh sách hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tải danh sách hoàn tiền");
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
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      setSubmitting(true);
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
        toast.success("Tạo yêu cầu hoàn tiền thành công");
        setIsModalVisible(false);
        // Reset form
        setWalletId("");
        setReferenceType("Order");
        setReferenceId("");
        setGrossAmountVnd(0);
        setPenaltyPct(0);
        setReason(RefundReasonEnum.Other);
        fetchRefunds();
      } else {
        toast.error(res.message || "Lỗi khi tạo hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tạo hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const executeApproveRefund = async (id: string) => {
    setApprovingRefundId(null);
    try {
      setSubmitting(true);
      const res = await adminFinanceApi.approveRefund(id);
      if (res.success) {
        toast.success("Duyệt hoàn tiền thành công");
        fetchRefunds();
      } else {
        toast.error(res.message || "Lỗi khi duyệt hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi duyệt hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = (id: string) => {
    setApprovingRefundId(id);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRefundId) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setSubmitting(true);
      const res = await adminFinanceApi.rejectRefund(rejectingRefundId, rejectReason.trim());
      if (res.success) {
        toast.success("Đã từ chối hoàn tiền");
        setRejectModalVisible(false);
        setRejectingRefundId(null);
        setRejectReason("");
        fetchRefunds();
      } else {
        toast.error(res.message || "Lỗi khi từ chối hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi từ chối hoàn tiền");
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
        <Button
          onClick={() => setIsModalVisible(true)}
          className="px-4.5 py-2.5"
        >
          <FiPlus />
          Tạo hoàn tiền
        </Button>
      </div>


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
                          <Button
                            size="sm"
                            onClick={() => handleApprove(record.id)}
                            loading={submitting}
                            title="Duyệt hoàn tiền"
                          >
                            <FiCheck className="text-sm" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setRejectingRefundId(record.id);
                              setRejectModalVisible(true);
                            }}
                            loading={submitting}
                            title="Từ chối hoàn tiền"
                          >
                            <FiX className="text-sm" />
                          </Button>
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
                <Input
                  label="Mã ví khách hàng *"
                  type="text"
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  placeholder="Nhập mã ví (Wallet ID)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Loại tham chiếu *"
                    type="text"
                    required
                    value={referenceType}
                    onChange={(e) => setReferenceType(e.target.value)}
                    placeholder="Ví dụ: Order..."
                  />
                </div>
                <div>
                  <Input
                    label="Mã tham chiếu *"
                    type="text"
                    required
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Mã đơn hoặc mã giao dịch..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Số tiền hoàn (VND) *"
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={grossAmountVnd}
                    onChange={(e) => setGrossAmountVnd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Phần trăm phạt (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={penaltyPct}
                    onChange={(e) => setPenaltyPct(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Lý do hoàn tiền"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RefundReasonEnum)}
                >
                  {Object.entries(REFUND_REASON_LABELS).map(([key, label]) => (
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
                  onClick={() => setIsModalVisible(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                >
                  Tạo mới
                </Button>
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
                <Textarea
                  label="Lý do từ chối yêu cầu hoàn tiền này"
                  rows={4}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRejectModalVisible(false);
                    setRejectReason("");
                    setRejectingRefundId(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={submitting}
                >
                  Xác nhận từ chối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE REFUND CONFIRM */}
      {approvingRefundId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <WarningCircle className="text-primary text-lg" />
                Xác nhận duyệt hoàn tiền
              </h4>
              <p className="text-xs text-gray-600 leading-normal">
                Bạn có chắc chắn muốn phê duyệt yêu cầu hoàn tiền này không? Số tiền sẽ được hoàn trả vào ví của khách hàng.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setApprovingRefundId(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => executeApproveRefund(approvingRefundId)}
                loading={submitting}
              >
                Xác nhận duyệt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
