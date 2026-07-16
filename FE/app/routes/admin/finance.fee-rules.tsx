import React, { useEffect, useState, useMemo } from "react";
import { PiPlusBold, PiPencilSimpleBold, PiTrashBold, PiXBold } from "react-icons/pi";
import { Input } from "~/components/ui/Input";
import { Select } from "~/components/ui/Select";
import { Button } from "~/components/ui/Button";
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
import { Pagination } from "~/components/ui/Pagination";

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

const toPercentDisplay = (val: number) => Math.round(val * 10000) / 100;

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
      setServiceFeePct(toPercentDisplay(rule.serviceFeePct));
      setIntlShipPerKgVnd(rule.intlShipPerKgVnd);
      setIntlShipVolDivisor(rule.intlShipVolDivisor);
      setMinChargeKg(rule.minChargeKg);
      setInspectionFeePct(toPercentDisplay(rule.inspectionFeePct));
      setInspectionMinVnd(rule.inspectionMinVnd);
      setInspectionMaxVnd(rule.inspectionMaxVnd);
      setStorageDailyPerKgVnd(rule.storageDailyPerKgVnd);
      setInsuranceBasicPct(toPercentDisplay(rule.insuranceBasicPct));
      setInsuranceFullPct(toPercentDisplay(rule.insuranceFullPct));
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
        serviceFeePct: serviceFeePct / 100,
        intlShipPerKgVnd,
        intlShipVolDivisor,
        minChargeKg,
        inspectionFeePct: inspectionFeePct / 100,
        inspectionMinVnd,
        inspectionMaxVnd,
        storageDailyPerKgVnd,
        insuranceBasicPct: insuranceBasicPct / 100,
        insuranceFullPct: insuranceFullPct / 100,
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
    } catch (error: unknown) {
      setErrorMessage((error as string) || "Có lỗi xảy ra khi lưu quy tắc phí");
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
    } catch (error: unknown) {
      setErrorMessage((error as string) || "Có lỗi xảy ra khi xóa quy tắc phí");
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
        <Button
          onClick={() => handleOpenModal()}
          className="px-4.5 py-2.5"
        >
          <PiPlusBold />
          Thêm quy tắc mới
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
                        <td className="py-3.5 px-6 text-right font-mono font-medium">{toPercentDisplay(record.serviceFeePct)}%</td>
                        <td className="py-3.5 px-6 text-right font-mono font-medium">{record.intlShipPerKgVnd.toLocaleString()} ₫</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.intlShipVolDivisor}</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{record.minChargeKg} kg</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">{toPercentDisplay(record.inspectionFeePct)}%</td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500 whitespace-nowrap">
                          {record.inspectionMinVnd.toLocaleString()}₫ - {record.inspectionMaxVnd.toLocaleString()}₫
                        </td>
                        <td className="py-3.5 px-6 text-right font-mono text-gray-500">
                          {toPercentDisplay(record.insuranceBasicPct)}% / {toPercentDisplay(record.insuranceFullPct)}%
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

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemName="quy tắc"
            />
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
                  <Input
                    label="Tên quy tắc *"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Phí vận chuyển tiêu chuẩn 2026..."
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
                  <Select
                    label="Áp dụng cho Hạng VIP"
                    value={vipTierId}
                    onChange={(e) => setVipTierId(e.target.value)}
                  >
                    <option value="">Chọn hạng VIP (bỏ trống = Tất cả)</option>
                    {vipTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Input
                    label="ID Nền tảng (Platform)"
                    type="text"
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    placeholder="Bỏ trống = Tất cả"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Input
                    label="Phí dịch vụ (%) *"
                    type="number"
                    required
                    step="any"
                    min={0}
                    value={serviceFeePct}
                    onChange={(e) => setServiceFeePct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Phí VCQT (VNĐ/kg) *"
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={intlShipPerKgVnd}
                    onChange={(e) => setIntlShipPerKgVnd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Hệ số thể tích *"
                    type="number"
                    required
                    min={1}
                    value={intlShipVolDivisor}
                    onChange={(e) => setIntlShipVolDivisor(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="KL tối thiểu (kg) *"
                    type="number"
                    required
                    step={0.1}
                    min={0}
                    value={minChargeKg}
                    onChange={(e) => setMinChargeKg(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Input
                    label="Phí kiểm đếm (%) *"
                    type="number"
                    required
                    step="any"
                    min={0}
                    value={inspectionFeePct}
                    onChange={(e) => setInspectionFeePct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Kiểm đếm Min (VNĐ) *"
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={inspectionMinVnd}
                    onChange={(e) => setInspectionMinVnd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Kiểm đếm Max (VNĐ) *"
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={inspectionMaxVnd}
                    onChange={(e) => setInspectionMaxVnd(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Lưu kho/kg/ngày *"
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={storageDailyPerKgVnd}
                    onChange={(e) => setStorageDailyPerKgVnd(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <Input
                    label="Bảo hiểm Cơ bản (%) *"
                    type="number"
                    required
                    step="any"
                    min={0}
                    value={insuranceBasicPct}
                    onChange={(e) => setInsuranceBasicPct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Bảo hiểm Toàn diện (%) *"
                    type="number"
                    required
                    step="any"
                    min={0}
                    value={insuranceFullPct}
                    onChange={(e) => setInsuranceFullPct(Number(e.target.value))}
                  />
                </div>
                <div className="sm:col-span-2"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Hiệu lực từ *"
                    type="datetime-local"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    label="Hiệu lực đến (Tùy chọn)"
                    type="datetime-local"
                    value={effectiveTo}
                    onChange={(e) => setEffectiveTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA]">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  loading={isLoading}
                >
                  {editingRule ? "Lưu Thay Đổi" : "Tạo Mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
