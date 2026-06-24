import React, { useEffect, useState, useMemo } from "react";
import { PiPlusBold, PiPencilSimpleBold, PiTrashBold, PiXBold } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  fetchVipTiers,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectFeeRules,
  selectVipTiers,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import dayjs from "dayjs";
import type { FeeRuleDto, CreateFeeRuleDto } from "~/lib/types/adminFinance";
import { ReduxStatus } from "~/lib/feature/const";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        active
          ? "bg-green-50 text-green-700 border-green-200/60"
          : "bg-rose-50 text-rose-700 border-rose-200/60"
      }`}
    >
      {active ? "Hoạt động" : "Tạm ngưng"}
    </span>
  );
}

export default function AdminFeeRulesPage() {
  const dispatch = useAppDispatch();
  const feeRules = useAppSelector(selectFeeRules);
  const vipTiers = useAppSelector(selectVipTiers);
  const status = useAppSelector(selectAdminFinanceStatus);
  const isLoading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRuleDto | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [vipTierId, setVipTierId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [serviceFeePct, setServiceFeePct] = useState(0);
  const [intlShipPerKgVnd, setIntlShipPerKgVnd] = useState(0);
  const [intlShipVolDivisor, setIntlShipVolDivisor] = useState(6000);
  const [minChargeKg, setMinChargeKg] = useState(0);
  const [inspectionFeePct, setInspectionFeePct] = useState(0);
  const [inspectionMinVnd, setInspectionMinVnd] = useState(0);
  const [inspectionMaxVnd, setInspectionMaxVnd] = useState(0);
  const [storageDailyPerKgVnd, setStorageDailyPerKgVnd] = useState(0);
  const [insuranceBasicPct, setInsuranceBasicPct] = useState(0);
  const [insuranceFullPct, setInsuranceFullPct] = useState(0);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchFeeRules());
    dispatch(fetchVipTiers());
  }, [dispatch]);

  const handleOpenModal = (rule?: FeeRuleDto) => {
    setErrorMessage("");
    setSuccessMessage("");
    if (rule) {
      setEditingRule(rule);
      setName(rule.name);
      setIsActive(rule.isActive);
      setVipTierId(rule.vipTierId || "");
      setPlatformId(rule.platformId || "");
      setServiceFeePct(rule.serviceFeePct);
      setIntlShipPerKgVnd(rule.intlShipPerKgVnd);
      setIntlShipVolDivisor(rule.intlShipVolDivisor);
      setMinChargeKg(rule.minChargeKg);
      setInspectionFeePct(rule.inspectionFeePct);
      setInspectionMinVnd(rule.inspectionMinVnd);
      setInspectionMaxVnd(rule.inspectionMaxVnd);
      setStorageDailyPerKgVnd(rule.storageDailyPerKgVnd);
      setInsuranceBasicPct(rule.insuranceBasicPct);
      setInsuranceFullPct(rule.insuranceFullPct);
      setEffectiveFrom(rule.effectiveFrom ? dayjs(rule.effectiveFrom).format("YYYY-MM-DDTHH:mm") : "");
      setEffectiveTo(rule.effectiveTo ? dayjs(rule.effectiveTo).format("YYYY-MM-DDTHH:mm") : "");
    } else {
      setEditingRule(null);
      setName("");
      setIsActive(true);
      setVipTierId("");
      setPlatformId("");
      setServiceFeePct(0);
      setIntlShipPerKgVnd(0);
      setIntlShipVolDivisor(6000);
      setMinChargeKg(0);
      setInspectionFeePct(0);
      setInspectionMinVnd(0);
      setInspectionMaxVnd(0);
      setStorageDailyPerKgVnd(0);
      setInsuranceBasicPct(0);
      setInsuranceFullPct(0);
      setEffectiveFrom(dayjs().format("YYYY-MM-DDTHH:mm"));
      setEffectiveTo("");
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingRule(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !effectiveFrom) {
      setErrorMessage("Vui lòng nhập tên quy tắc và ngày hiệu lực");
      return;
    }
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const payload: CreateFeeRuleDto = {
        name: name.trim(),
        isActive,
        vipTierId: vipTierId ? vipTierId : undefined,
        platformId: platformId.trim() ? platformId.trim() : undefined,
        serviceFeePct,
        intlShipPerKgVnd,
        intlShipVolDivisor,
        minChargeKg,
        inspectionFeePct,
        inspectionMinVnd,
        inspectionMaxVnd,
        storageDailyPerKgVnd,
        insuranceBasicPct,
        insuranceFullPct,
        effectiveFrom: dayjs(effectiveFrom).format("YYYY-MM-DD"),
        effectiveTo: effectiveTo ? dayjs(effectiveTo).format("YYYY-MM-DD") : undefined,
      };

      if (editingRule) {
        await dispatch(updateFeeRule({ id: editingRule.id, data: payload })).unwrap();
        setSuccessMessage("Cập nhật quy tắc phí thành công");
      } else {
        await dispatch(createFeeRule(payload)).unwrap();
        setSuccessMessage("Thêm quy tắc phí mới thành công");
      }
      handleCloseModal();
      dispatch(fetchFeeRules());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error || "Có lỗi xảy ra khi lưu quy tắc phí");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa quy tắc này không?")) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await dispatch(deleteFeeRule(id)).unwrap();
      setSuccessMessage("Xóa quy tắc phí thành công");
      dispatch(fetchFeeRules());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error || "Có lỗi xảy ra khi xóa quy tắc phí");
    }
  };

  const totalItems = feeRules.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedFeeRules = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return feeRules.slice(start, start + pageSize);
  }, [feeRules, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý quy tắc tính phí</h1>
          <p className="text-sm text-gray-500">Cấu hình các loại phí dịch vụ, vận chuyển, kiểm đếm và bảo hiểm</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4.5 py-2.5 rounded transition-colors"
        >
          <PiPlusBold />
          Thêm quy tắc mới
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

      {/* Fee Rules Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {isLoading && feeRules.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 min-w-[160px]">Tên quy tắc</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6">Hạng VIP</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Phí dịch vụ (%)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">VCQT (đ/kg)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Hệ số thể tích</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">KL tối thiểu</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Kiểm đếm (%)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Kiểm đếm (Min-Max)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Bảo hiểm (Cơ bản/Full)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-right">Lưu kho (đ/kg/ngày)</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6">Hiệu lực từ</th>
                    <th className="font-mono uppercase text-gray-400 tracking-wider py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedFeeRules.map((record) => {
                    const tier = vipTiers.find((t) => t.id === record.vipTierId);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors text-black">
                        <td className="py-3.5 px-6 font-semibold">{record.name}</td>
                        <td className="py-3.5 px-6">
                          {record.vipTierId ? (
                            <span 
                              className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold text-white border"
                              style={{ 
                                backgroundColor: tier?.colorHex || "#3b82f6", 
                                borderColor: tier?.colorHex || "#2563eb"
                              }}
                            >
                              {tier?.name || record.vipTierId}
                            </span>
                          ) : (
                            <span className="text-gray-400">Mặc định</span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono font-medium">{record.serviceFeePct}%</td>
                        <td className="py-3.5 px-6 text-right font-mono font-medium">{record.intlShipPerKgVnd.toLocaleString()} ₫</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.intlShipVolDivisor}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.minChargeKg} kg</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.inspectionFeePct}%</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500 whitespace-nowrap">
                          {record.inspectionMinVnd.toLocaleString()}₫ - {record.inspectionMaxVnd.toLocaleString()}₫
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">
                          {record.insuranceBasicPct}% / {record.insuranceFullPct}%
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.storageDailyPerKgVnd.toLocaleString()} ₫</td>
                        <td className="py-3.5 px-6">
                          <StatusBadge active={record.isActive} />
                        </td>
                        <td className="py-3.5 px-6 text-gray-500 whitespace-nowrap">
                          {dayjs(record.effectiveFrom).format("DD/MM/YYYY HH:mm")}
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <div className="inline-flex gap-1.5 justify-center">
                            <button
                              onClick={() => handleOpenModal(record)}
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
                    );
                  })}
                  {feeRules.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-gray-400">
                        Chưa có quy tắc phí nào được tạo.
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
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} quy tắc
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

      {/* Modal Cập Nhật / Thêm quy tắc */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-4xl w-full p-6 shadow-2xl flex flex-col font-sans my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">
                {editingRule ? "Cập Nhật Quy Tắc Phí" : "Thêm Quy Tắc Phí Mới"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Tên quy tắc *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Phí vận chuyển tiêu chuẩn 2026..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">
                    Trạng thái hoạt động
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Áp dụng cho Hạng VIP
                  </label>
                  <select
                    value={vipTierId}
                    onChange={(e) => setVipTierId(e.target.value)}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white font-medium"
                  >
                    <option value="">Chọn hạng VIP (bỏ trống = Tất cả)</option>
                    {vipTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    ID Nền tảng (Platform)
                  </label>
                  <input
                    type="text"
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    placeholder="Bỏ trống = Tất cả"
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Phí dịch vụ (%) *
                  </label>
                  <input
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={serviceFeePct}
                    onChange={(e) => setServiceFeePct(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Phí VCQT (VNĐ/kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={intlShipPerKgVnd}
                    onChange={(e) => setIntlShipPerKgVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Hệ số thể tích *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={intlShipVolDivisor}
                    onChange={(e) => setIntlShipVolDivisor(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    KL tối thiểu (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={minChargeKg}
                    onChange={(e) => setMinChargeKg(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Phí kiểm đếm (%) *
                  </label>
                  <input
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={inspectionFeePct}
                    onChange={(e) => setInspectionFeePct(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Kiểm đếm Min (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={inspectionMinVnd}
                    onChange={(e) => setInspectionMinVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Kiểm đếm Max (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={inspectionMaxVnd}
                    onChange={(e) => setInspectionMaxVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Lưu kho/kg/ngày *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={storageDailyPerKgVnd}
                    onChange={(e) => setStorageDailyPerKgVnd(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Bảo hiểm Cơ bản (%) *
                  </label>
                  <input
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={insuranceBasicPct}
                    onChange={(e) => setInsuranceBasicPct(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Bảo hiểm Toàn diện (%) *
                  </label>
                  <input
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={insuranceFullPct}
                    onChange={(e) => setInsuranceFullPct(Number(e.target.value))}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Hiệu lực từ *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Hiệu lực đến (Tùy chọn)
                  </label>
                  <input
                    type="datetime-local"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                  {editingRule ? "Lưu Thay Đổi" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
