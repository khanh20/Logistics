import React, { useEffect, useState, useMemo } from "react";
import { PiWarningBold, PiArrowClockwiseBold, PiXBold, PiCopyBold, PiCheckBold } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchFraudCases, reviewFraudCase } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectFraudCases, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { 
  FRAUD_STATUS_LABELS, 
  FRAUD_STATUS_COLORS, 
  FRAUD_TYPE_LABELS,
  FRAUD_ACTION_LABELS
} from "~/lib/constants/finance";
import { FraudStatusEnum } from "~/lib/enums/finance";
import type { FraudDetectionDto } from "~/lib/types/adminFinance";
import dayjs from "dayjs";

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
        title="Copy Customer ID"
      >
        {copied ? <PiCheckBold className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: FraudStatusEnum }) {
  const label = FRAUD_STATUS_LABELS[status] || "Không xác định";
  const color = FRAUD_STATUS_COLORS[status] || "default";

  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (color === "error") {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else if (color === "warning") {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (color === "success") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (color === "processing" || color === "blue" || color === "cyan") {
    classes += "bg-blue-50 text-blue-700 border-blue-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }

  return <span className={classes}>{label}</span>;
}

export default function AdminFraudPage() {
  const dispatch = useAppDispatch();
  const fraudCases = useAppSelector(selectFraudCases);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<FraudDetectionDto | null>(null);

  // Form State
  const [caseStatus, setCaseStatus] = useState<FraudStatusEnum>(FraudStatusEnum.Open);
  const [resolutionNote, setResolutionNote] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchFraudCases());
  }, [dispatch]);

  const handleReview = (record: FraudDetectionDto) => {
    setSelectedCase(record);
    setCaseStatus(record.status);
    setResolutionNote(record.resolutionNote || "");
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await dispatch(reviewFraudCase({ 
        id: selectedCase.id, 
        data: {
          status: caseStatus,
          resolutionNote: resolutionNote.trim()
        }
      })).unwrap();
      setSuccessMessage("Cập nhật trạng thái thành công!");
      setIsModalVisible(false);
      dispatch(fetchFraudCases());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage(err || "Có lỗi xảy ra");
    }
  };

  const totalItems = fraudCases.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return fraudCases.slice(start, start + pageSize);
  }, [fraudCases, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <PiWarningBold className="text-2xl text-rose-600" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-black mb-1">Phát hiện gian lận</h1>
            <p className="text-sm text-gray-500">Giám sát các cảnh báo rủi ro giao dịch của hệ thống</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(fetchFraudCases())}
          disabled={loading}
          className="inline-flex items-center gap-1.5 bg-white border border-[#EAEAEA] hover:bg-gray-50 text-black text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
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

      {/* Fraud Cases Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && fraudCases.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã KH</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Loại gian lận</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Điểm rủi ro</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Hành động hệ thống</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày tạo</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedCases.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.customerId} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {record.fraudType ? FRAUD_TYPE_LABELS[record.fraudType as keyof typeof FRAUD_TYPE_LABELS] : "Không rõ"}
                      </td>
                      <td className="py-3.5 px-6 font-semibold font-mono">
                        <span className={record.riskScore > 80 ? "text-rose-600 font-bold" : "text-amber-600"}>
                          {record.riskScore}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200">
                          {record.action ? FRAUD_ACTION_LABELS[record.action as keyof typeof FRAUD_ACTION_LABELS] : "N/A"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3.5 px-6 text-gray-500">
                        {dayjs(record.createdDate).format("DD/MM/YYYY HH:mm")}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleReview(record)}
                          className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                        >
                          Kiểm tra
                        </button>
                      </td>
                    </tr>
                  ))}
                  {fraudCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Không phát hiện trường hợp rủi ro nào.
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
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} sự vụ
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

      {/* Modal Đánh giá gian lận */}
      {isModalVisible && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">Đánh giá gian lận</h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-[#F7F6F3] rounded border border-[#EAEAEA] text-xs space-y-1.5 text-black">
              <p><strong>Mã khách hàng:</strong> <span className="font-mono">{selectedCase.customerId}</span></p>
              <p><strong>Điểm rủi ro:</strong> <span className="font-mono font-bold text-rose-600">{selectedCase.riskScore}</span></p>
              <p><strong>Bằng chứng hệ thống:</strong></p>
              <pre className="bg-white p-2 rounded border border-[#EAEAEA] overflow-x-auto text-[10px] max-h-32 text-gray-700">
                {selectedCase.evidenceJson}
              </pre>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Trạng thái xử lý *
                </label>
                <select
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(Number(e.target.value) as FraudStatusEnum)}
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white font-medium"
                >
                  <option value={FraudStatusEnum.Open}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Open]}</option>
                  <option value={FraudStatusEnum.Investigating}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Investigating]}</option>
                  <option value={FraudStatusEnum.Confirmed}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Confirmed]}</option>
                  <option value={FraudStatusEnum.FalsePositive}>{FRAUD_STATUS_LABELS[FraudStatusEnum.FalsePositive]}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Ghi chú giải quyết
                </label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Nhập ghi chú chi tiết về cách giải quyết..."
                  className="w-full rounded border border-[#EAEAEA] p-3 text-sm text-black focus:border-black focus:outline-none"
                ></textarea>
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
                  disabled={loading}
                  className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? "Đang xử lý..." : "Cập nhật trạng thái"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
