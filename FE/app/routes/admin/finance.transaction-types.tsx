import React, { useState, useEffect, useCallback, useMemo } from "react";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Select } from "~/components/ui/Select";
import { TransactionDirectionEnum } from "~/lib/enums/finance";
import { TRANSACTION_DIRECTION_COLORS, TRANSACTION_DIRECTION_LABELS } from "~/lib/constants/finance";
import type { TransactionTypeDto } from "~/lib/types/adminFinance";
import { Pagination } from "~/components/ui/Pagination";
import { ArrowClockwise, PencilSimple, Plus, Trash, Warning, X } from "~/components/shared/icons";

function DirectionBadge({ direction }: { direction?: TransactionDirectionEnum }) {
  if (!direction) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        Không có
      </span>
    );
  }
  const label = TRANSACTION_DIRECTION_LABELS[direction] || "Không rõ";
  const color = TRANSACTION_DIRECTION_COLORS[direction] || "default";

  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (color === "success" || color === "green") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (color === "processing" || color === "blue" || color === "cyan" || color === "geekblue") {
    classes += "bg-blue-50 text-blue-700 border-blue-200/60";
  } else if (color === "warning" || color === "orange") {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (color === "error" || color === "red" || color === "rose") {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }

  return <span className={classes}>{label}</span>;
}

export default function AdminTransactionTypesPage() {
  const [data, setData] = useState<TransactionTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<number | "">("");
  const [isReversible, setIsReversible] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchTransactionTypes = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await adminFinanceApi.getAllTransactionTypes();
      if (res.success) {
        setData(res.data || []);
      }
    } catch (error) {
      setErrorMessage("Lỗi khi tải danh sách loại giao dịch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactionTypes();
  }, [fetchTransactionTypes]);

  const handleOpenModal = (record?: TransactionTypeDto) => {
    setErrorMessage("");
    setSuccessMessage("");
    if (record) {
      setEditingId(record.id);
      setCode(record.code);
      setName(record.name);
      setDirection(record.direction !== undefined && record.direction !== null ? record.direction : "");
      setIsReversible(record.isReversible);
    } else {
      setEditingId(null);
      setCode("");
      setName("");
      setDirection("");
      setIsReversible(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ mã và tên loại giao dịch");
      return;
    }
    try {
      setErrorMessage("");
      setSuccessMessage("");
      const values = {
        code: code.trim(),
        name: name.trim(),
        direction: direction !== "" ? Number(direction) : undefined,
        isReversible,
      };

      if (editingId) {
        await adminFinanceApi.updateTransactionType(editingId, { ...values, id: editingId });
        setSuccessMessage("Cập nhật loại giao dịch thành công");
      } else {
        await adminFinanceApi.createTransactionType(values);
        setSuccessMessage("Thêm loại giao dịch thành công");
      }
      handleCloseModal();
      fetchTransactionTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      setErrorMessage("Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa?")) return;
    try {
      setErrorMessage("");
      setSuccessMessage("");
      await adminFinanceApi.deleteTransactionType(id);
      setSuccessMessage("Xóa loại giao dịch thành công");
      fetchTransactionTypes();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (error) {
      setErrorMessage("Lỗi khi xóa loại giao dịch");
    }
  };

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Quản lý loại giao dịch</h1>
          <p className="text-sm text-gray-500">Cấu hình danh mục mã loại, luồng tiền và khả năng hoàn tác giao dịch</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchTransactionTypes}
            variant="secondary"
            loading={loading}
          >
            <ArrowClockwise />
            Làm mới
          </Button>
          <Button
            onClick={() => handleOpenModal()}
          >
            <Plus />
            Thêm mới
          </Button>
        </div>
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

      {/* Transaction Types Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {loading && data.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã loại</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tên loại</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Chiều giao dịch</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Có thể hoàn tác</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedData.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors text-black">
                      <td className="py-3.5 px-6 font-mono font-semibold">
                        <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs">
                          {record.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        {record.name}
                      </td>
                      <td className="py-3.5 px-6">
                        <DirectionBadge direction={record.direction} />
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                            record.isReversible
                              ? "bg-green-50 text-green-700 border-green-200/60"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                          }`}
                        >
                          {record.isReversible ? "Có" : "Không"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <div className="inline-flex gap-2.5 justify-center">
                          <button
                            onClick={() => handleOpenModal(record)}
                            className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors"
                            title="Sửa"
                          >
                            <PencilSimple className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Xóa"
                          >
                            <Trash className="text-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400">
                        Chưa có loại giao dịch nào.
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
              itemName="loại giao dịch"
            />
          </>
        )}
      </div>

      {/* Modal Chỉnh Sửa / Thêm Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-5">
              <h3 className="text-base font-serif font-bold text-black">
                {editingId ? "Cập nhật loại giao dịch" : "Thêm loại giao dịch"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <X className="text-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label="Mã loại giao dịch *"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Nhập mã (VD: DEPOSIT, WITHDRAW)..."
                />
              </div>

              <div>
                <Input
                  label="Tên loại giao dịch *"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên loại giao dịch..."
                />
              </div>

              <div>
                <Select
                  label="Chiều giao dịch"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Chọn chiều giao dịch</option>
                  {Object.entries(TRANSACTION_DIRECTION_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  id="isReversible"
                  checked={isReversible}
                  onChange={(e) => setIsReversible(e.target.checked)}
                  className="rounded border-[#EAEAEA] text-black focus:ring-black h-4 w-4"
                />
                <label htmlFor="isReversible" className="text-sm font-medium text-black cursor-pointer">
                  Có thể hoàn tác
                </label>
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
                >
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
