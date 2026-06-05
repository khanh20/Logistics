import React, { useEffect, useState, useMemo } from "react";
import { PiPlusBold, PiTrashBold, PiBankBold, PiXBold, PiCopyBold, PiCheckBold } from "react-icons/pi";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchSystemBankAccounts,
  createSystemBankAccount,
  toggleBankAccountStatus,
  deleteSystemBankAccount,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectSystemBankAccounts,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import type { WebhookServiceEnum } from "~/lib/enums/finance";
import { WEBHOOK_SERVICE_LABELS } from "~/lib/constants/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import dayjs from "dayjs";
import type { CreateBankAccountDto } from "~/lib/types/bankAccount";

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1 group font-mono text-sm text-[#2F3437]">
      <span>{text}</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy"
      >
        {copied ? <PiCheckBold className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

export default function SystemBankAccountsPage() {
  const dispatch = useAppDispatch();
  const bankAccounts = useAppSelector(selectSystemBankAccounts);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);

  // Form State
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [branch, setBranch] = useState("");
  const [webhookService, setWebhookService] = useState<number | "">("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    dispatch(fetchSystemBankAccounts());
  }, [dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankCode || !accountNumber.trim() || !accountHolder.trim() || !branch.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const selectedBank = VIETNAM_BANKS.find((b) => b.code === bankCode);
      const bankName = selectedBank ? selectedBank.shortName : "";

      const values: CreateBankAccountDto = {
        bankCode,
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        branch: branch.trim(),
        webhookService: webhookService !== "" ? (webhookService as WebhookServiceEnum) : undefined,
      };

      await dispatch(createSystemBankAccount(values)).unwrap();
      setSuccessMessage("Thêm tài khoản hệ thống thành công");
      setIsModalVisible(false);
      // Reset Form
      setBankCode("");
      setAccountNumber("");
      setAccountHolder("");
      setBranch("");
      setWebhookService("");
      dispatch(fetchSystemBankAccounts());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error || "Lỗi khi thêm tài khoản");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await dispatch(toggleBankAccountStatus(id)).unwrap();
      setSuccessMessage("Cập nhật trạng thái thành công");
      dispatch(fetchSystemBankAccounts());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản này?")) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await dispatch(deleteSystemBankAccount(id)).unwrap();
      setSuccessMessage("Xóa tài khoản thành công");
      dispatch(fetchSystemBankAccounts());
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error: any) {
      setErrorMessage(error || "Lỗi khi xóa tài khoản");
    }
  };

  const activeAccounts = bankAccounts.filter((b) => b.isActive).length;
  const totalItems = bankAccounts.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return bankAccounts.slice(start, start + pageSize);
  }, [bankAccounts, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Tài khoản hệ thống</h1>
          <p className="text-sm text-gray-500">Quản lý các tài khoản ngân hàng nhận tiền của hệ thống</p>
        </div>
        <button
          onClick={() => setIsModalVisible(true)}
          className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-4.5 py-2.5 rounded transition-colors"
        >
          <PiPlusBold />
          Thêm tài khoản
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <PiBankBold className="text-xl" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-0.5">Tổng số tài khoản</p>
            <h3 className="text-2xl font-serif font-bold text-black">{totalItems}</h3>
          </div>
        </div>
        <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-700 rounded-lg">
            <PiBankBold className="text-xl" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-0.5">Tài khoản hoạt động</p>
            <h3 className="text-2xl font-serif font-bold text-green-600">{activeAccounts}</h3>
          </div>
        </div>
      </div>

      {/* Bank Accounts Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && bankAccounts.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngân hàng</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tài khoản</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Chủ tài khoản</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Chi nhánh</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Webhook</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Trạng thái</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Ngày tạo</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedAccounts.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors text-black">
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-black">{record.bankName}</span>
                          <span className="text-xs text-gray-400 font-mono">{record.bankCode}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.accountNumber} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        {record.accountHolder}
                      </td>
                      <td className="py-3.5 px-6 text-gray-600">
                        {record.branch}
                      </td>
                      <td className="py-3.5 px-6">
                        {record.webhookService ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-semibold">
                            {WEBHOOK_SERVICE_LABELS[record.webhookService]}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={record.isActive}
                            onChange={() => handleToggleStatus(record.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                        </label>
                      </td>
                      <td className="py-3.5 px-6 text-gray-500 text-xs font-mono">
                        {record.createdDate ? dayjs(record.createdDate).format("DD/MM/YYYY HH:mm") : "-"}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <PiTrashBold className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bankAccounts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        Chưa cấu hình tài khoản ngân hàng hệ thống nào.
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
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} tài khoản
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

      {/* Modal Thêm tài khoản */}
      {isModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-xl w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">Thêm tài khoản hệ thống</h3>
              <button
                onClick={() => setIsModalVisible(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Ngân hàng *
                </label>
                <select
                  required
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white font-medium"
                >
                  <option value="">Chọn ngân hàng</option>
                  {VIETNAM_BANKS.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.shortName} - {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Số tài khoản *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="VD: 1903..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                    Chủ tài khoản *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Chi nhánh *
                </label>
                <input
                  type="text"
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="VD: Chi nhánh HCM..."
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Dịch vụ Webhook (Tùy chọn)
                </label>
                <select
                  value={webhookService}
                  onChange={(e) => setWebhookService(e.target.value ? Number(e.target.value) : "")}
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none bg-white font-medium"
                >
                  <option value="">Chọn dịch vụ đồng bộ giao dịch</option>
                  {Object.entries(WEBHOOK_SERVICE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
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
                  {loading ? "Đang xử lý..." : "Thêm tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
