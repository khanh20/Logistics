import React, { useEffect, useState, useMemo } from "react";
import { PiPlusBold, PiPencilSimpleBold, PiTrashBold, PiStarBold, PiXBold } from "react-icons/pi";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchVipTiers,
  createVipTier,
  updateVipTier,
  deleteVipTier
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectVipTiers, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import type { VipTierDto, CreateVipTierDto } from "~/lib/types/adminFinance";
import { Pagination } from "~/components/ui/Pagination";

export default function AdminVipTiersPage() {
  const dispatch = useAppDispatch();
  const vipTiers = useAppSelector(selectVipTiers);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTier, setEditingTier] = useState<VipTierDto | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [level, setLevel] = useState(0);
  const [minSpendVnd, setMinSpendVnd] = useState(0);
  const [colorHex, setColorHex] = useState("");
  const [serviceFeeDiscountPct, setServiceFeeDiscountPct] = useState(0);
  const [cashbackPct, setCashbackPct] = useState(0);
  const [depositPctOverride, setDepositPctOverride] = useState<number | undefined>(undefined);
  const [freeInspection, setFreeInspection] = useState(false);
  const [prioritySupport, setPrioritySupport] = useState(false);
  const [freeStorageDays, setFreeStorageDays] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchVipTiers());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingTier(null);
    setName("");
    setLevel(0);
    setMinSpendVnd(0);
    setColorHex("");
    setServiceFeeDiscountPct(0);
    setCashbackPct(0);
    setDepositPctOverride(undefined);
    setFreeInspection(false);
    setPrioritySupport(false);
    setFreeStorageDays(0);
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalVisible(true);
  };

  const handleEdit = (record: VipTierDto) => {
    setEditingTier(record);
    setName(record.name);
    setLevel(record.level);
    setMinSpendVnd(record.minSpendVnd);
    setColorHex(record.colorHex || "");
    setServiceFeeDiscountPct(record.serviceFeeDiscountPct);
    setCashbackPct(record.cashbackPct);
    setDepositPctOverride(record.depositPctOverride ?? undefined);
    setFreeInspection(record.freeInspection);
    setPrioritySupport(record.prioritySupport);
    setFreeStorageDays(record.freeStorageDays);
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xác nhận xóa hạng VIP này?")) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await dispatch(deleteVipTier(id)).unwrap();
      setSuccessMessage("Xóa hạng VIP thành công!");
      dispatch(fetchVipTiers());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: unknown) {
      setErrorMessage((err as string) || "Không thể xóa hạng VIP");
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập tên hạng VIP");
      return;
    }
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const payload: CreateVipTierDto = {
        name: name.trim(),
        level,
        minSpendVnd,
        colorHex: colorHex.trim() ? colorHex.trim() : undefined,
        serviceFeeDiscountPct,
        cashbackPct,
        depositPctOverride: depositPctOverride !== undefined ? depositPctOverride : undefined,
        freeInspection,
        prioritySupport,
        freeStorageDays,
      };

      if (editingTier) {
        await dispatch(updateVipTier({ id: editingTier.id, data: payload })).unwrap();
        setSuccessMessage("Cập nhật hạng VIP thành công!");
      } else {
        await dispatch(createVipTier(payload)).unwrap();
        setSuccessMessage("Tạo hạng VIP mới thành công!");
      }
      setIsModalVisible(false);
      dispatch(fetchVipTiers());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: unknown) {
      setErrorMessage((err as string) || "Có lỗi xảy ra");
    }
  };

  const totalItems = vipTiers.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedTiers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return vipTiers.slice(start, start + pageSize);
  }, [vipTiers, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2.5">
          <PiStarBold className="text-2xl text-yellow-500 animate-none" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý Hạng VIP</h1>
            <p className="text-sm text-gray-500">Cấu hình cấp độ, hạn mức chi tiêu và đặc quyền của khách hàng</p>
          </div>
        </div>
        <Button
          onClick={handleCreate}
          className="px-4.5 py-2.5"
        >
          <PiPlusBold />
          Thêm hạng VIP
        </Button>
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

      {/* VIP Tiers Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && vipTiers.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Hạng VIP</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Cấp độ</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Chi tiêu tối thiểu (VND)</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Giảm phí DV (%)</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ưu đãi đặc quyền</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Hoàn tiền (%)</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedTiers.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors text-black">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          {record.colorHex && (
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-gray-200"
                              style={{ backgroundColor: record.colorHex.startsWith('#') ? record.colorHex : `#${record.colorHex}` }}
                            />
                          )}
                          <span className="font-semibold">{record.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        VIP {record.level}
                      </td>
                      <td className="py-3.5 px-6 font-mono font-medium">
                        {record.minSpendVnd.toLocaleString()} ₫
                      </td>
                      <td className="py-3.5 px-6 font-mono font-medium text-green-700">
                        {record.serviceFeeDiscountPct}%
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5 text-xs text-green-700 font-medium">
                          {record.freeInspection && <span>• Miễn phí kiểm đếm</span>}
                          {record.prioritySupport && <span>• CSKH Ưu tiên</span>}
                          {record.freeStorageDays > 0 && <span>• Lưu kho miễn phí {record.freeStorageDays} ngày</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-6 font-mono">
                        {record.cashbackPct}%
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="inline-flex gap-2.5 justify-center">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="Sửa"
                          >
                            <PiPencilSimpleBold className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <PiTrashBold className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vipTiers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        Chưa cấu hình hạng VIP nào.
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
              itemName="thứ hạng"
            />
          </>
        )}
      </div>

      {/* Modal Chỉnh Sửa / Thêm Mới Hạng VIP */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-xl w-full p-6 shadow-2xl flex flex-col font-sans my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">
                {editingTier ? "Chỉnh sửa hạng VIP" : "Thêm hạng VIP mới"}
              </h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Tên hạng VIP *"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Bạc, Vàng, Kim Cương..."
                  />
                </div>
                <div>
                  <Input
                    label="Cấp độ (1, 2, 3...) *"
                    type="number"
                    required
                    min={0}
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Chi tiêu tối thiểu (VND) *"
                    type="number"
                    required
                    min={0}
                    value={minSpendVnd}
                    onChange={(e) => setMinSpendVnd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Mã màu (Hex)"
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    placeholder="VD: #FFD700"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded border border-[#EAEAEA] space-y-4">
                <span className="block text-xs font-mono uppercase tracking-wider text-gray-500 border-b border-[#EAEAEA] pb-1.5">
                  Đặc quyền & Ưu đãi
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Giảm phí dịch vụ (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={serviceFeeDiscountPct}
                      onChange={(e) => setServiceFeeDiscountPct(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Input
                      label="Tỷ lệ hoàn tiền (%)"
                      type="number"
                      min={0}
                      max={100}
                      value={cashbackPct}
                      onChange={(e) => setCashbackPct(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <Input
                    label="Tỷ lệ đặt cọc riêng (%)"
                    type="number"
                    min={0}
                    max={100}
                    value={depositPctOverride ?? ""}
                    onChange={(e) => setDepositPctOverride(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Để trống nếu theo mặc định"
                  />
                </div>

                <div className="flex flex-wrap gap-6 items-center">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-black">
                    <input
                      type="checkbox"
                      checked={freeInspection}
                      onChange={(e) => setFreeInspection(e.target.checked)}
                      className="rounded border-[#EAEAEA] text-black focus:ring-black h-4 w-4"
                    />
                    <span>Miễn phí kiểm đếm</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-black">
                    <input
                      type="checkbox"
                      checked={prioritySupport}
                      onChange={(e) => setPrioritySupport(e.target.checked)}
                      className="rounded border-[#EAEAEA] text-black focus:ring-black h-4 w-4"
                    />
                    <span>CSKH Ưu tiên</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-black">Lưu kho miễn phí:</label>
                    <input
                      type="number"
                      min={0}
                      value={freeStorageDays}
                      onChange={(e) => setFreeStorageDays(Number(e.target.value))}
                      className="w-16 rounded border border-[#EAEAEA] px-2 py-1 text-sm text-black focus:border-black focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">ngày</span>
                  </div>
                </div>
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
                  loading={loading}
                >
                  {editingTier ? "Lưu Thay Đổi" : "Tạo Mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
