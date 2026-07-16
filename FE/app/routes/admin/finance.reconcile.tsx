import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { PiPlusBold, PiCheckCircleBold, PiXBold, PiWarningCircleBold, PiDotsThreeBold, PiFileTextBold } from "react-icons/pi";
import { Input } from "~/components/ui/Input";
import { Textarea } from "~/components/ui/Textarea";
import { Button } from "~/components/ui/Button";
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
  RECONCILE_STATUS_LABELS 
} from "~/lib/constants/finance";
import { ReconcileStatusEnum } from "~/lib/enums/finance";
import dayjs from "dayjs";
import { ReduxStatus } from "~/lib/feature/const";
import { Pagination } from "~/components/ui/Pagination";

function StatusBadge({ status }: { status: ReconcileStatusEnum }) {
  const label = RECONCILE_STATUS_LABELS[status] || status;
  let colorClass = "bg-gray-50 text-gray-700 border-gray-200/60";
  let dotClass = "bg-gray-400";

  if (status === ReconcileStatusEnum.Matched) {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    dotClass = "bg-emerald-500";
  } else if (status === ReconcileStatusEnum.Pending) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200/60";
    dotClass = "bg-amber-500";
  } else if (status === ReconcileStatusEnum.Discrepancy) {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200/60";
    dotClass = "bg-rose-500";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse flex flex-col">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 px-6 border-b border-[#EAEAEA]">
          <div className="h-4 bg-gray-100 rounded w-24"></div>
          <div className="h-4 bg-gray-100 rounded w-20"></div>
          <div className="h-4 bg-gray-100 rounded w-32"></div>
          <div className="h-4 bg-gray-100 rounded w-24 ml-auto"></div>
          <div className="h-4 bg-gray-100 rounded w-24 ml-auto"></div>
          <div className="h-4 bg-gray-100 rounded w-20"></div>
          <div className="h-6 bg-gray-100 rounded-full w-20"></div>
        </div>
      ))}
    </div>
  );
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
  const [cnySpent, setCnySpent] = useState<number | "">("");
  const [vndEquivalent, setVndEquivalent] = useState<number | "">("");
  const [serviceFeeCollectedVnd, setServiceFeeCollectedVnd] = useState<number | "">("");
  const [alipayStatementUrl, setAlipayStatementUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

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
        cnySpent: Number(cnySpent),
        vndEquivalent: Number(vndEquivalent),
        serviceFeeCollectedVnd: Number(serviceFeeCollectedVnd),
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
      setCnySpent("");
      setVndEquivalent("");
      setServiceFeeCollectedVnd("");
      setAlipayStatementUrl("");
      setNotes("");
      dispatch(fetchReconciles());
    } catch (error: unknown) {
      toast.error((error as string) || "Có lỗi xảy ra khi tạo đối soát");
    }
  };

  const executeConfirmReconcile = async (id: string) => {
    setConfirmingReconcileId(null);
    try {
      await dispatch(confirmReconcile(id)).unwrap();
      toast.success("Đã xác nhận khớp đối soát!");
    } catch (error: unknown) {
      toast.error((error as string) || "Lỗi khi xác nhận đối soát");
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
          <h1 className="text-2xl font-serif font-bold text-black tracking-tight">Đối soát nền tảng</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và đồng bộ dữ liệu tài chính với các bên trung gian</p>
        </div>
        <Button
          onClick={() => setIsModalVisible(true)}
          className="px-4.5 py-2"
        >
          <PiPlusBold />
          Tạo đối soát
        </Button>
      </div>

      {/* Reconcile Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg overflow-hidden">
        {loading && reconciles.length === 0 ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-[#EAEAEA]">
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap">Ngày đối soát</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap">Nền tảng</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap">Tài khoản</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap text-right">Chi tiêu CNY</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap text-right">Tương đương VND</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap text-right">Phí dịch vụ VND</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 whitespace-nowrap">Trạng thái</th>
                    <th className="font-medium text-xs text-gray-500 py-3.5 px-6 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedReconciles.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/30 transition-colors group">
                      <td className="py-3 px-6 text-gray-600 font-mono text-[13px]">
                        {dayjs(record.reconcileDate).format("DD/MM/YYYY")}
                      </td>
                      <td className="py-3 px-6 font-medium text-black">
                        {record.platformId.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-6 text-gray-600 font-mono text-[13px]">
                        {record.platformAccountId.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-6 font-mono text-[13px] text-right">
                        {record.cnySpent != null ? `${record.cnySpent.toLocaleString()} ¥` : "-"}
                      </td>
                      <td className="py-3 px-6 font-mono text-[13px] text-black font-medium text-right">
                        {record.vndEquivalent != null ? `${record.vndEquivalent.toLocaleString()} ₫` : "-"}
                      </td>
                      <td className="py-3 px-6 font-mono text-[13px] text-gray-500 text-right">
                        {record.serviceFeeCollectedVnd != null ? `${record.serviceFeeCollectedVnd.toLocaleString()} ₫` : "-"}
                      </td>
                      <td className="py-3 px-6">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="inline-flex gap-2 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {record.status === ReconcileStatusEnum.Pending && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleConfirm(record.id)}
                              className="h-7 text-xs px-2.5"
                            >
                              <PiCheckCircleBold className="mr-1" />
                              Khớp
                            </Button>
                          )}
                          {record.alipayStatementUrl && (
                            <a
                              href={record.alipayStatementUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-7 w-7 rounded border border-[#EAEAEA] text-gray-500 hover:text-black hover:border-gray-300 transition-colors bg-white"
                              title="Xem sao kê"
                            >
                              <PiFileTextBold />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reconciles.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                        Không có dữ liệu đối soát.
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
            />
          </>
        )}
      </div>

      {/* Slide-over Overlay for Creation */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex justify-end font-sans">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalVisible(false)}
          />
          
          {/* Panel */}
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0 border-l border-[#EAEAEA]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAEAEA]">
              <div>
                <h3 className="text-lg font-serif font-bold text-black tracking-tight">Tạo đối soát mới</h3>
                <p className="text-xs text-gray-500 mt-0.5">Nhập thông tin đối soát từ sao kê nền tảng</p>
              </div>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors rounded-full p-1 hover:bg-gray-100"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <form id="create-form" onSubmit={handleCreate} className="space-y-5">
                
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Thông tin chung</h4>
                  <Input
                    label="Ngày đối soát *"
                    type="date"
                    required
                    value={reconcileDate}
                    onChange={(e) => setReconcileDate(e.target.value)}
                  />
                  <Input
                    label="Mã nền tảng (ID) *"
                    type="text"
                    required
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    placeholder="VD: 550e8400-e29b-41d4..."
                  />
                  <Input
                    label="Tài khoản nền tảng (ID) *"
                    type="text"
                    required
                    value={platformAccountId}
                    onChange={(e) => setPlatformAccountId(e.target.value)}
                    placeholder="VD: 550e8400-e29b-41d4..."
                  />
                </div>

                <div className="pt-4 border-t border-[#EAEAEA] space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Số liệu sao kê</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Chi tiêu CNY *"
                      type="number"
                      required
                      min={0}
                      value={cnySpent}
                      onChange={(e) => setCnySpent(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0.00"
                    />
                    <Input
                      label="Tương đương VND *"
                      type="number"
                      required
                      min={0}
                      value={vndEquivalent}
                      onChange={(e) => setVndEquivalent(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <Input
                    label="Phí dịch vụ VND *"
                    type="number"
                    required
                    min={0}
                    value={serviceFeeCollectedVnd}
                    onChange={(e) => setServiceFeeCollectedVnd(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                  />
                  <Input
                    label="Đường dẫn sao kê"
                    type="text"
                    value={alipayStatementUrl}
                    onChange={(e) => setAlipayStatementUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4 border-t border-[#EAEAEA]">
                  <Textarea
                    label="Ghi chú"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm nếu có..."
                  />
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-[#EAEAEA] bg-gray-50 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalVisible(false)}
                className="w-24"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                form="create-form"
                loading={loading}
                className="flex-1"
              >
                Tạo đối soát
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM RECONCILE */}
      {confirmingReconcileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <PiWarningCircleBold className="text-amber-500 text-lg" />
                Xác nhận đối soát
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Bạn có chắc chắn muốn xác nhận khớp đối soát này không? Thao tác này sẽ tự động cập nhật số dư thực tế của tài khoản nền tảng.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-5 mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingReconcileId(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => executeConfirmReconcile(confirmingReconcileId)}
                className="bg-black hover:bg-gray-900 text-white"
              >
                Xác nhận khớp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
