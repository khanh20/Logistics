import React, { useEffect, useState, useMemo } from "react";
import { PiTerminalBold, PiArrowClockwiseBold, PiXBold, PiCopyBold, PiCheckBold } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchWebhookLogs } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectWebhookLogs, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { WEBHOOK_PROCESSING_STATUS_LABELS } from "~/lib/constants/finance";
import { WebhookProcessingStatusEnum } from "~/lib/enums/finance";
import type { BankWebhookLogDto } from "~/lib/types/adminFinance";
import dayjs from "dayjs";
import { Pagination } from "~/components/ui/Pagination";
import { Select } from "~/components/ui/Select";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";

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

function StatusBadge({ status }: { status?: WebhookProcessingStatusEnum }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-gray-50 text-gray-500 border-gray-200">
        Chưa xử lý
      </span>
    );
  }

  const label = WEBHOOK_PROCESSING_STATUS_LABELS[status] || status;

  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (status === WebhookProcessingStatusEnum.Matched) {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (status === WebhookProcessingStatusEnum.Unmatched) {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (
    status === WebhookProcessingStatusEnum.Error ||
    status === WebhookProcessingStatusEnum.Failed
  ) {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }

  return <span className={classes}>{label}</span>;
}

export default function AdminWebhookLogsPage() {
  const dispatch = useAppDispatch();
  const webhookLogs = useAppSelector(selectWebhookLogs);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [selectedLog, setSelectedLog] = useState<BankWebhookLogDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchWebhookLogs());
  }, [dispatch]);

  const filteredLogs = useMemo(() => {
    return webhookLogs.filter((log) => {
      // Filter by status
      if (statusFilter !== "all" && log.processingStatus?.toString() !== statusFilter) {
        return false;
      }
      // Filter by date range
      if (startDate && dayjs(log.transactionDate).isBefore(dayjs(startDate).startOf("day"))) {
        return false;
      }
      if (endDate && dayjs(log.transactionDate).isAfter(dayjs(endDate).endOf("day"))) {
        return false;
      }
      return true;
    });
  }, [webhookLogs, statusFilter, startDate, endDate]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <PiTerminalBold className="text-2xl text-blue-600 animate-none" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-black mb-1">Nhật ký Webhook Ngân hàng</h1>
            <p className="text-sm text-gray-500">Giám sát các phản hồi webhook tự động từ đối tác thanh toán</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchWebhookLogs())}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded transition-colors disabled:opacity-50"
        >
          <PiArrowClockwiseBold className={loading ? "animate-spin" : ""} />
          Làm mới
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

      {/* Filters & Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 shadow-sm mb-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Từ ngày</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Đến ngày</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Trạng thái</label>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-48 mb-0"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(WEBHOOK_PROCESSING_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </div>
          {(startDate || endDate || statusFilter !== "all") && (
            <Button
              variant="secondary"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>

        {loading && webhookLogs.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 w-40">Thời gian</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã GD Ứng dụng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tham chiếu Ngân hàng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền (VND)</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Nội dung CK</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Topup ID đã khớp</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 w-36">Trạng thái xử lý</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-center w-28">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedLogs.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors text-black">
                      <td className="py-3.5 px-6 font-mono text-xs whitespace-nowrap">
                        {dayjs(record.transactionDate).format("DD/MM/YYYY HH:mm:ss")}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-gray-500">
                        {record.idempotencyKey || "—"}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-gray-500">
                        {record.bankRef || "—"}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold text-green-700">
                        {record.amountVnd ? `+${record.amountVnd.toLocaleString()} ₫` : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-gray-600 max-w-xs truncate" title={record.transferContent}>
                        {record.transferContent || "—"}
                      </td>
                      <td className="py-3.5 px-6">
                        {record.matchedTopupId ? (
                          <CopyableText text={record.matchedTopupId} />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={record.processingStatus} />
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => setSelectedLog(record)}
                          className="bg-white border border-[#EAEAEA] hover:bg-gray-50 text-black text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
                        >
                          Xem JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {webhookLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Chưa nhận được phản hồi webhook nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="log phản hồi"
            />
          </>
        )}
      </div>

      {/* Modal View JSON Payload */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-2xl w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Raw JSON Payload</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <div className="overflow-auto max-h-96 bg-gray-50 p-4 border border-[#EAEAEA] rounded text-left">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap select-all">
                {selectedLog.rawPayload ? (
                  (() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedLog.rawPayload), null, 2);
                    } catch {
                      return selectedLog.rawPayload;
                    }
                  })()
                ) : (
                  "Không có dữ liệu payload"
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#EAEAEA] mt-4">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4.5 py-2 rounded transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
