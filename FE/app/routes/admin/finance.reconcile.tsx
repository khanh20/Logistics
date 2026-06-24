import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { PiPlusBold, PiCheckCircleBold, PiXBold, PiWarningCircleBold } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { 
  fetchReconciles, 
  createReconcile, 
  confirmReconcile 
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { 
  selectReconciles, 
  selectAdminFinanceStatus 
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import { 
  RECONCILE_STATUS_COLORS, 
  RECONCILE_STATUS_LABELS 
} from "~/lib/constants/finance";
import { ReconcileStatusEnum } from "~/lib/enums/finance";
import dayjs from "dayjs";
import { ReduxStatus } from "~/lib/feature/const";

function StatusBadge({ status }: { status: ReconcileStatusEnum }) {
  const label = RECONCILE_STATUS_LABELS[status] || status;
  const color = RECONCILE_STATUS_COLORS[status] || "default";

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

export default function ReconcilePage() {
  const dispatch = useAppDispatch();
  const reconciles = useAppSelector(selectReconciles);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [confirmingReconcileId, setConfirmingReconcileId] = useState<string | null>(null);

  // Form State
  const [reconcileDate, setReconcileDate] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [platformAccountId, setPlatformAccountId] = useState("");
  const [cnySpent, setCnySpent] = useState<number>(0);
  const [vndEquivalent, setVndEquivalent] = useState<number>(0);
  const [serviceFeeCollectedVnd, setServiceFeeCollectedVnd] = useState<number>(0);
  const [alipayStatementUrl, setAlipayStatementUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchReconciles());
  }, [dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileDate || !platformId.trim() || !platformAccountId.trim()) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc");
      return;
    }
    try {
      const payload = {
        reconcileDate: new Date(reconcileDate).toISOString(),
        platformId: platformId.trim(),
        platformAccountId: platformAccountId.trim(),
        cnySpent,
        vndEquivalent,
        serviceFeeCollectedVnd,
        alipayStatementUrl: alipayStatementUrl.trim(),
        notes: notes.trim(),
      };

      await dispatch(createReconcile(payload)).unwrap();
      toast.success("Tạo đối soát thành công!");
      setIsModalVisible(false);
      // Reset form
      setReconcileDate("");
      setPlatformId("");
      setPlatformAccountId("");
      setCnySpent(0);
      setVndEquivalent(0);
      setServiceFeeCollectedVnd(0);
      setAlipayStatementUrl("");
      setNotes("");
      dispatch(fetchReconciles());
    } catch (error: any) {
      toast.error(error || "Có lỗi xảy ra khi tạo đối soát");
    }
  };

  const executeConfirmReconcile = async (id: string) => {
    setConfirmingReconcileId(null);
    try {
      await dispatch(confirmReconcile(id)).unwrap();
      toast.success("Đã xác nhận khớp đối soát!");
    } catch (error: any) {
      toast.error(error || "Lỗi khi xác nhận đối soát");
    }
  };

  const handleConfirm = (id: string) => {
    setConfirmingReconcileId(id);
  };

  const totalItems = reconciles.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedReconciles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reconciles.slice(start, start + pageSize);
  }, [reconciles, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý đối soát nền tảng</h1>
          <p className="text-sm text-gray-500">Đồng bộ hóa dữ liệu tài chính với các bên nền tảng trung gian</p>
        </div>
        <button
          onClick={() => setIsModalVisible(true)}
          className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4.5 py-2.5 rounded transition-colors"
        >
          <PiPlusBold />
          Tạo đối soát mới
        </button>
      </div>


      {/* Reconcile Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && reconciles.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày đối soát</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Nền tảng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tài khoản</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Chi tiêu CNY</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tương đương VND</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Phí dịch vụ VND</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedReconciles.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        {dayjs(record.reconcileDate).format("DD/MM/YYYY")}
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {record.platformId}
                      </td>
                      <td className="py-3.5 px-6">
                        {record.platformAccountId}
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        {record.cnySpent != null ? `${record.cnySpent.toLocaleString()} ¥` : "-"}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-black font-medium">
                        {record.vndEquivalent != null ? `${record.vndEquivalent.toLocaleString()} ₫` : "-"}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-gray-500">
                        {record.serviceFeeCollectedVnd != null ? `${record.serviceFeeCollectedVnd.toLocaleString()} ₫` : "-"}
                      </td>
                      <td className="py-3.5 px-6">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex gap-3 justify-end items-center">
                          {record.status === ReconcileStatusEnum.Pending && (
                            <button
                              onClick={() => handleConfirm(record.id)}
                              className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors"
                            >
                              <PiCheckCircleBold />
                              Khớp
                            </button>
                          )}
                          {record.alipayStatementUrl && (
                            <a
                              href={record.alipayStatementUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline font-semibold"
                            >
                              Xem sao kê
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reconciles.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        Không có dữ liệu đối soát.
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
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} đối soát
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

      {/* Modal Tạo đối soát */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-2xl w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">Tạo đối soát mới</h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Ngày đối soát *
                  </label>
                  <input
                    type="date"
                    required
                    value={reconcileDate}
                    onChange={(e) => setReconcileDate(e.target.value)}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Mã nền tảng *
                  </label>
                  <input
                    type="text"
                    required
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    placeholder="VD: 1688, Taobao..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Tài khoản nền tảng *
                  </label>
                  <input
                    type="text"
                    required
                    value={platformAccountId}
                    onChange={(e) => setPlatformAccountId(e.target.value)}
                    placeholder="Tài khoản mua hàng..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Đường dẫn sao kê
                  </label>
                  <input
                    type="text"
                    value={alipayStatementUrl}
                    onChange={(e) => setAlipayStatementUrl(e.target.value)}
                    placeholder="URL file sao kê..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Chi tiêu CNY *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cnySpent}
                    onChange={(e) => setCnySpent(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Tương đương VND *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={vndEquivalent}
                    onChange={(e) => setVndEquivalent(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Phí dịch vụ VND *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={serviceFeeCollectedVnd}
                    onChange={(e) => setServiceFeeCollectedVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú thêm nếu có..."
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
                  {loading ? "Đang xử lý..." : "Tạo đối soát"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM RECONCILE */}
      {confirmingReconcileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <PiWarningCircleBold className="text-primary text-lg" />
                Xác nhận đối soát
              </h4>
              <p className="text-xs text-gray-600 leading-normal">
                Bạn có chắc chắn muốn xác nhận khớp đối soát này không? Thao tác này sẽ cập nhật trạng thái đối soát thành công.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-5">
              <button
                type="button"
                onClick={() => setConfirmingReconcileId(null)}
                className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => executeConfirmReconcile(confirmingReconcileId)}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
