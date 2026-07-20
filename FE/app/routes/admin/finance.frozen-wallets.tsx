import React, { useEffect, useState, useMemo } from "react";
import { PiLockKeyBold, PiArrowClockwiseBold, PiXBold, PiLockOpenBold, PiShieldCheckBold, PiShieldSlashBold } from "react-icons/pi";
import { useAppDispatch } from "~/lib/feature/hooks";
import { fetchFrozenWallets, unlockWallet, toggleTrustWallet } from "~/lib/feature/finance/adminWalletThunk";
import type { FrozenWalletDto } from "~/lib/types/finance";
import dayjs from "dayjs";
import { Button } from "~/components/ui/Button";
import { Textarea } from "~/components/ui/Textarea";
import { toast } from "react-toastify";
import { Pagination } from "~/components/ui/Pagination";

export default function AdminFrozenWalletsPage() {
  const dispatch = useAppDispatch();
  const [wallets, setWallets] = useState<FrozenWalletDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<FrozenWalletDto | null>(null);
  const [unlockReason, setUnlockReason] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [statusFilter, setStatusFilter] = useState<"all" | "frozen" | "normal">("all");
  const [trustFilter, setTrustFilter] = useState<"all" | "trusted" | "untrusted">("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await dispatch(fetchFrozenWallets()).unwrap();
      setWallets(data || []);
    } catch (err: unknown) {
      toast.error((err as string) || "Lỗi tải danh sách ví");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const handleUnlockClick = (record: FrozenWalletDto) => {
    setSelectedWallet(record);
    setUnlockReason("");
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    if (!unlockReason.trim()) {
      toast.error("Vui lòng nhập lý do mở khóa.");
      return;
    }

    try {
      await dispatch(unlockWallet({ id: selectedWallet.walletId, reason: unlockReason.trim() })).unwrap();
      toast.success("Mở khóa ví thành công!");
      setIsModalVisible(false);
      loadData();
    } catch (err: unknown) {
      toast.error((err as string) || "Có lỗi xảy ra khi mở khóa ví");
    }
  };

  const handleToggleTrust = async (record: FrozenWalletDto) => {
    try {
      await dispatch(toggleTrustWallet(record.walletId)).unwrap();
      toast.success(record.ignoreFraudDetection ? "Đã gỡ cờ tin cậy." : "Đã đánh dấu ví an toàn (Bỏ qua AI)!");
      loadData();
    } catch (err: unknown) {
      toast.error((err as string) || "Lỗi khi thay đổi trạng thái tin cậy");
    }
  };

  const filteredWallets = useMemo(() => {
    return wallets.filter(w => {
      const matchStatus = statusFilter === "all" ? true : (statusFilter === "frozen" ? w.isFrozen : !w.isFrozen);
      const matchTrust = trustFilter === "all" ? true : (trustFilter === "trusted" ? w.ignoreFraudDetection : !w.ignoreFraudDetection);
      return matchStatus && matchTrust;
    });
  }, [wallets, statusFilter, trustFilter]);

  const totalItems = filteredWallets.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedWallets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWallets.slice(start, start + pageSize);
  }, [filteredWallets, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <PiLockKeyBold className="text-2xl text-rose-600" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý ví</h1>
            <p className="text-sm text-gray-500">Quản lý và kiểm soát trạng thái, bảo mật của toàn bộ ví khách hàng</p>
          </div>
        </div>
        <Button
          onClick={loadData}
          disabled={loading}
          variant="secondary"
          className="inline-flex items-center gap-1.5"
        >
          <PiArrowClockwiseBold className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái khóa</label>
          <select 
            className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-black"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as "all" | "frozen" | "normal"); setCurrentPage(1); }}
          >
            <option value="all">Tất cả ví</option>
            <option value="frozen">Đang bị khóa</option>
            <option value="normal">Bình thường</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cờ an toàn</label>
          <select 
            className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-black"
            value={trustFilter}
            onChange={(e) => { setTrustFilter(e.target.value as "all" | "trusted" | "untrusted"); setCurrentPage(1); }}
          >
            <option value="all">Tất cả</option>
            <option value="trusted">Đã gắn cờ (An toàn)</option>
            <option value="untrusted">Chưa gắn cờ</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && wallets.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Khách hàng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số dư</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Điểm rủi ro</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Nguyên nhân</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày khóa</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedWallets.map((record) => (
                    <tr key={record.walletId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-black">{record.customerName}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{record.customerId.substring(0,8)}...</div>
                      </td>
                      <td className="py-3.5 px-6 font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          {record.isFrozen ? (
                            <PiLockKeyBold className="text-rose-500 text-lg" title="Đang bị khóa" />
                          ) : (
                            <PiLockOpenBold className="text-emerald-500 text-lg" title="Bình thường" />
                          )}
                          <span>{record.availableBalance.toLocaleString("en-US")} đ</span>
                        </div>
                        {record.frozenBalance > 0 && (
                          <div className="text-xs text-rose-500 mt-0.5 ml-6">+{record.frozenBalance.toLocaleString("en-US")} đ (đóng băng)</div>
                        )}
                      </td>
                      <td className="py-3.5 px-6 font-semibold font-mono text-rose-600">
                        {record.riskScore > 0 ? record.riskScore : "-"}
                      </td>
                      <td className="py-3.5 px-6 text-rose-600 max-w-[350px] align-top text-xs leading-relaxed">
                        {record.reason && record.reason !== "Không xác định" ? (
                          <ul className="list-disc pl-3 space-y-1">
                            {record.reason
                              .split(/\s*\|\s*|\n/)
                              .filter(r => r.trim() && !r.includes('Fallback C#'))
                              .map((r, i) => (
                                <li key={i}>{r.trim()}</li>
                              ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-gray-500">
                        {record.isFrozen || record.frozenDate ? dayjs(record.frozenDate).format("DD/MM/YYYY HH:mm") : "-"}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleToggleTrust(record)}
                            size="sm"
                            variant="secondary"
                            className={record.ignoreFraudDetection 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-colors" 
                              : "bg-white border-gray-300 hover:bg-gray-50 text-gray-600 transition-colors"}
                            title={record.ignoreFraudDetection ? "Gỡ cờ tin cậy" : "Đánh dấu an toàn (Bỏ qua AI)"}
                          >
                            {record.ignoreFraudDetection ? (
                              <PiShieldCheckBold className="text-emerald-600 text-base" />
                            ) : (
                              <PiShieldSlashBold className="text-gray-400 text-base" />
                            )}
                          </Button>
                          {record.isFrozen && (
                            <Button
                              onClick={() => handleUnlockClick(record)}
                              size="sm"
                              variant="secondary"
                              className="bg-white border-gray-300 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                            >
                              <PiLockOpenBold className="mr-1.5" />
                              Mở khóa
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {wallets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        Không có ví nào đang bị khóa.
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
              itemName="ví"
            />
          </>
        )}
      </div>

      {/* Modal Mở khóa */}
      {isModalVisible && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black flex items-center gap-2">
                <PiLockOpenBold className="text-green-600" />
                Xác nhận mở khóa ví
              </h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-amber-50 rounded border border-amber-200 text-sm space-y-1.5 text-amber-900">
              <p>Bạn sắp mở khóa ví cho khách hàng <strong>{selectedWallet.customerName}</strong>.</p>
              <p>Khách hàng sẽ có thể nạp, rút tiền và thanh toán bình thường.</p>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <Textarea
                  label="Lý do mở khóa *"
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="Ví dụ: Đã xác minh thân phận khách hàng an toàn..."
                  required
                />
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
                  disabled={loading}
                  loading={loading}
                  className="bg-green-600 hover:bg-green-700 text-white border-transparent"
                >
                  Xác nhận mở khóa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
