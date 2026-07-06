import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  PiCheckBold,
  PiXBold,
  PiBankBold,
  PiClockBold,
  PiCoinsBold,
  PiCopyBold,
  PiCheckBold as PiCheckIcon
} from "react-icons/pi";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import { Button } from "~/components/ui/Button";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  selectPendingWithdraws,
  selectAdminFinanceStatus
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import {
  fetchPendingWithdraws,
  approveWithdraw,
  rejectWithdraw
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { ReduxStatus } from "~/lib/feature/const";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import { WITHDRAW_STATUS_LABELS, WITHDRAW_STATUS_COLORS } from "~/lib/constants/finance";

function StatusBadge({ status }: { status: number }) {
  const label = WITHDRAW_STATUS_LABELS[status as keyof typeof WITHDRAW_STATUS_LABELS] || "Không xác định";
  const color = WITHDRAW_STATUS_COLORS[status as keyof typeof WITHDRAW_STATUS_COLORS] || "default";

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
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy Wallet ID"
      >
        {copied ? <PiCheckIcon className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

export default function AdminFinanceWithdraws() {
  const dispatch = useAppDispatch();
  const pendingWithdraws = useAppSelector(selectPendingWithdraws);
  const status = useAppSelector(selectAdminFinanceStatus);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawResponseDto | null>(null);

  const [transferRef, setTransferRef] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchPendingWithdraws());
  }, [dispatch]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdraw || !transferRef.trim()) return;
    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await dispatch(approveWithdraw({
        id: selectedWithdraw.id,
        data: { transferRef: transferRef.trim() }
      })).unwrap();
      setSuccessMessage("Duyệt yêu cầu rút tiền thành công");
      setApproveModalVisible(false);
      setTransferRef("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error?.message || "Đã xảy ra lỗi khi duyệt");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdraw || !rejectReason.trim()) return;
    setActionLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await dispatch(rejectWithdraw({
        id: selectedWithdraw.id,
        data: { reason: rejectReason.trim() }
      })).unwrap();
      setSuccessMessage("Từ chối yêu cầu rút tiền thành công");
      setRejectModalVisible(false);
      setRejectReason("");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error?.message || "Đã xảy ra lỗi khi từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveModal = (record: WithdrawResponseDto) => {
    setSelectedWithdraw(record);
    setTransferRef("");
    setApproveModalVisible(true);
  };

  const openRejectModal = (record: WithdrawResponseDto) => {
    setSelectedWithdraw(record);
    setRejectReason("");
    setRejectModalVisible(true);
  };

  const totalPendingAmount = pendingWithdraws.reduce((sum, item) => sum + item.amountVnd, 0);
  const isLoading = status === ReduxStatus.LOADING;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-black mb-1">Duyệt yêu cầu rút tiền</h1>
        <p className="text-sm text-gray-500">Quản lý các yêu cầu rút tiền đang chờ xử lý từ khách hàng</p>
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

      {/* KPI Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Yêu cầu chờ duyệt</p>
            <h3 className="text-2xl font-serif font-bold text-black">{pendingWithdraws.length}</h3>
          </div>
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 border border-blue-100/50">
            <PiClockBold className="text-xl" />
          </div>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Tổng tiền cần duyệt</p>
            <h3 className="text-2xl font-serif font-bold text-rose-600">{totalPendingAmount.toLocaleString()} ₫</h3>
          </div>
          <div className="p-3 rounded-full bg-rose-50 text-rose-600 border border-rose-100/50">
            <PiCoinsBold className="text-xl" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {isLoading && pendingWithdraws.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã ví khách hàng</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Thông tin ngân hàng</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Phí</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Thực nhận</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Thời gian tạo</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                  <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA]">
                {pendingWithdraws.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-6">
                      <CopyableText text={record.walletId} />
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-black flex items-center gap-1.5">
                          <PiBankBold className="text-gray-400 text-xs" />
                          {record.bankName}
                        </span>
                        <span className="text-xs font-mono font-medium text-black">{record.bankAccountNo}</span>
                        <span className="text-xs text-gray-500 uppercase">{record.accountHolder}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-rose-600">
                      {record.amountVnd.toLocaleString()} ₫
                    </td>
                    <td className="py-3.5 px-6 text-gray-500">
                      {record.feeVnd.toLocaleString()} ₫
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-green-700">
                      {record.netAmountVnd.toLocaleString()} ₫
                    </td>
                    <td className="py-3.5 px-6 text-gray-500">
                      {record.createdDate ? dayjs(record.createdDate).format("DD/MM/YYYY HH:mm") : "-"}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openApproveModal(record)}
                        >
                          <PiCheckBold />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => openRejectModal(record)}
                        >
                          <PiXBold />
                          Từ chối
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingWithdraws.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Không có yêu cầu rút tiền nào cần duyệt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Duyệt */}
      {approveModalVisible && selectedWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Duyệt yêu cầu rút tiền</h3>
              <button
                onClick={() => setApproveModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold />
              </button>
            </div>

            <div className="mb-4 p-4 bg-[#F7F6F3] rounded border border-[#EAEAEA] text-xs space-y-1.5 text-black">
              <p><strong>Mã ví khách hàng:</strong> <span className="font-mono">{selectedWithdraw.walletId}</span></p>
              <p><strong>Ngân hàng:</strong> {selectedWithdraw.bankName} - {selectedWithdraw.bankAccountNo}</p>
              <p><strong>Tên chủ tài khoản:</strong> {selectedWithdraw.accountHolder}</p>
              <p>
                <strong>Số tiền thực nhận:</strong>{" "}
                <span className="text-green-700 font-bold text-sm">
                  {selectedWithdraw.netAmountVnd.toLocaleString()} ₫
                </span>
              </p>
            </div>

            <form onSubmit={handleApprove}>
              <div className="mb-4">
                <Input
                  label="Mã giao dịch chuyển khoản"
                  type="text"
                  required
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Nhập mã giao dịch của ngân hàng (FT...)"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setApproveModalVisible(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={actionLoading}
                >
                  Xác nhận duyệt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ chối */}
      {rejectModalVisible && selectedWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Từ chối yêu cầu rút tiền</h3>
              <button
                onClick={() => setRejectModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold />
              </button>
            </div>

            <div className="mb-4 p-4 bg-[#F7F6F3] rounded border border-[#EAEAEA] text-xs space-y-1.5 text-black">
              <p><strong>Mã ví khách hàng:</strong> <span className="font-mono">{selectedWithdraw.walletId}</span></p>
              <p><strong>Tên chủ tài khoản:</strong> {selectedWithdraw.accountHolder}</p>
              <p><strong>Ngân hàng:</strong> {selectedWithdraw.bankName} - {selectedWithdraw.bankAccountNo}</p>
              <p>
                <strong>Số tiền rút:</strong>{" "}
                <span className="text-rose-600 font-bold text-sm">
                  {selectedWithdraw.amountVnd.toLocaleString()} ₫
                </span>
              </p>
            </div>

            <form onSubmit={handleReject}>
              <div className="mb-4">
                <Textarea
                  label="Lý do từ chối"
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ví dụ: Thông tin tài khoản không hợp lệ..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRejectModalVisible(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  loading={actionLoading}
                >
                  Xác nhận từ chối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
