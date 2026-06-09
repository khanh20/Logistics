import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { financeApi } from "~/lib/api/finance";
import type { WalletTransactionDto } from "~/lib/types/finance";
import { formatVND, formatDate } from "~/lib/utils/format";
import {
  PiClockBold,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiArrowLeftBold,
  PiFunnelBold,
  PiMagnifyingGlassBold
} from "react-icons/pi";

export default function FinanceHistoryPage() {
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeApi.getMyHistory();
      if (res.data) {
        setTransactions(res.data);
      } else {
        setError(res.message || "Không thể tải lịch sử giao dịch.");
      }
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter Logic
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Filter by transaction type
    if (filterType !== "all") {
      const typeCode = tx.typeName?.toUpperCase() || tx.referenceType?.toUpperCase() || "";
      if (filterType === "TOPUP" && !typeCode.includes("TOPUP") && !typeCode.includes("NẠP")) return false;
      if (filterType === "WITHDRAW" && !typeCode.includes("WITHDRAW") && !typeCode.includes("RÚT")) return false;
      if (filterType === "PAYMENT" && !typeCode.includes("PAYMENT") && !typeCode.includes("THANH TOÁN")) return false;
      if (filterType === "REFUND" && !typeCode.includes("REFUND") && !typeCode.includes("HOÀN")) return false;
    }

    // 2. Filter by date range
    if (startDate) {
      const txDate = new Date(tx.createdDate || "");
      const filterStart = new Date(startDate);
      filterStart.setHours(0, 0, 0, 0);
      if (txDate < filterStart) return false;
    }
    if (endDate) {
      const txDate = new Date(tx.createdDate || "");
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);
      if (txDate > filterEnd) return false;
    }

    // 3. Filter by search text (note, reference type, reference ID, type name)
    if (searchText) {
      const search = searchText.toLowerCase();
      const note = (tx.note || "").toLowerCase();
      const refId = (tx.referenceId || "").toLowerCase();
      const refType = (tx.referenceType || "").toLowerCase();
      const typeName = (tx.typeName || "").toLowerCase();
      if (
        !note.includes(search) &&
        !refId.includes(search) &&
        !refType.includes(search) &&
        !typeName.includes(search)
      ) {
        return false;
      }
    }

    return true;
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, filterType, searchText]);

  // Paginated Data
  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto max-w-5xl px-6 py-24 text-neutral-900 bg-[#FFFFFF] min-h-screen">
      {/* ── BACK BUTTON ── */}
      <div className="mb-12">
        <Link
          to="/finance"
          className="inline-flex items-center text-sm font-mono uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <PiArrowLeftBold className="mr-2 text-base" /> Tài chính
        </Link>
      </div>

      {/* ── EDITORIAL HEADER ── */}
      <div className="mb-16 pt-6 pb-12 text-center border-b border-[#EAEAEA]">
        <h1 className="text-5xl md:text-6xl font-serif tracking-tight text-neutral-900 mb-6">
          Biến động số dư
        </h1>
        <p className="mx-auto max-w-xl text-sm md:text-base text-neutral-500 font-sans leading-relaxed">
          Theo dõi lịch sử giao dịch cộng, trừ tiền và số dư ví chi tiết của tài khoản.
        </p>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-6 bg-[#FBFBFA] border border-[#EAEAEA] rounded-lg">
        {/* Date Start */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
            Từ ngày
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAEAEA] bg-white rounded font-mono text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Date End */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
            Đến ngày
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAEAEA] bg-white rounded font-mono text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
            Loại giao dịch
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 border border-[#EAEAEA] bg-white rounded text-sm focus:outline-none focus:border-neutral-900"
          >
            <option value="all">Tất cả loại giao dịch</option>
            <option value="TOPUP">Nạp tiền (Topup)</option>
            <option value="WITHDRAW">Rút tiền (Withdraw)</option>
            <option value="PAYMENT">Thanh toán (Payment)</option>
            <option value="REFUND">Hoàn tiền (Refund)</option>
          </select>
        </div>

        {/* Search Text */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
            Tìm kiếm
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ghi chú, mã tham chiếu..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#EAEAEA] bg-white rounded text-sm focus:outline-none focus:border-neutral-900"
            />
            <PiMagnifyingGlassBold className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ── TRANSACTIONS TABLE ── */}
      <div className="rounded-lg border border-[#EAEAEA] bg-white p-6 md:p-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EAEAEA]">
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Thời gian
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Loại GD
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Biến động
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Số dư
                </th>
                <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-4 font-semibold">
                  Tham chiếu & Ghi chú
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-mono">
                    Đang tải lịch sử giao dịch...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-rose-600 font-mono">
                    {error}
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-mono">
                    Không tìm thấy lịch sử giao dịch nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((record) => {
                  const isIncrement = record.balanceAfter >= record.balanceBefore;
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-gray-600 font-mono">
                        {formatDate(record.createdDate || "")}
                      </td>
                      <td className="py-4 font-medium text-gray-800">
                        <span className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-100 border border-[#EAEAEA] tracking-wide uppercase">
                          {record.typeName || record.referenceType || "Giao dịch"}
                        </span>
                      </td>
                      <td className="py-4 font-mono">
                        {isIncrement ? (
                          <span className="text-[#346538] font-semibold">
                            +{formatVND(record.amount)}
                          </span>
                        ) : (
                          <span className="text-[#9F2F2D] font-semibold">
                            -{formatVND(record.amount)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-mono text-gray-800 font-medium">
                        {formatVND(record.balanceAfter)}
                      </td>
                      <td className="py-4 text-gray-500 max-w-[280px]">
                        <div className="truncate font-sans text-neutral-800" title={record.note || ""}>
                          {record.note || "---"}
                        </div>
                        {record.referenceId && (
                          <div className="text-xs font-mono text-neutral-400 mt-1 select-all">
                            Ref: {record.referenceType} ({record.referenceId.slice(0, 8)}...)
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#EAEAEA] pt-6 mt-4">
            <span className="text-sm text-gray-400 font-mono">
              Trang {page} / {totalPages} (Tổng số {filteredTransactions.length} giao dịch)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <PiCaretLeftBold className="text-base" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <PiCaretRightBold className="text-base" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
