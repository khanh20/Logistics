import React, { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import {
  PiArrowClockwiseBold,
  PiMagnifyingGlassBold,
  PiCopyBold,
  PiCheckBold
} from "react-icons/pi";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchWalletTransactions } from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectWalletTransactions,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import {
  TRANSACTION_DIRECTION_COLORS,
} from "~/lib/constants/finance";
import { TransactionDirectionEnum } from "~/lib/enums/finance";
import { ReduxStatus } from "~/lib/feature/const";
import type { WalletTransactionDto } from "~/lib/types/adminFinance";

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
        title="Copy ID"
      >
        {copied ? <PiCheckBold className="text-green-600 text-xs" /> : <PiCopyBold className="text-xs" />}
      </button>
    </div>
  );
}

function DirectionBadge({ record }: { record: WalletTransactionDto }) {
  const isCredit = record.balanceAfter >= record.balanceBefore;
  const direction = isCredit
    ? TransactionDirectionEnum.Credit
    : TransactionDirectionEnum.Debit;

  const color = TRANSACTION_DIRECTION_COLORS[direction];
  let classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ";
  if (color === "success") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  }

  return (
    <span className={classes}>
      {isCredit ? "+" : "-"} {record.amount.toLocaleString()} ₫
    </span>
  );
}

export default function AdminFinanceTransactionsPage() {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(selectWalletTransactions);
  const status = useAppSelector(selectAdminFinanceStatus);

  const [walletIdFilter, setWalletIdFilter] = useState("");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchWalletTransactions());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchWalletTransactions());
  };

  const dateRange = useMemo(() => {
    const start = startDateStr ? dayjs(startDateStr) : null;
    const end = endDateStr ? dayjs(endDateStr) : null;
    return { start, end };
  }, [startDateStr, endDateStr]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      let matchesWalletId = true;
      if (walletIdFilter) {
        matchesWalletId = t.walletId
          .toLowerCase()
          .includes(walletIdFilter.toLowerCase());
      }
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        const tDate = dayjs(t.createdDate);
        matchesDate =
          tDate.isAfter(dateRange.start.startOf("day")) &&
          tDate.isBefore(dateRange.end.endOf("day"));
      } else if (dateRange.start) {
        const tDate = dayjs(t.createdDate);
        matchesDate = tDate.isAfter(dateRange.start.startOf("day"));
      } else if (dateRange.end) {
        const tDate = dayjs(t.createdDate);
        matchesDate = tDate.isBefore(dateRange.end.endOf("day"));
      }
      return matchesWalletId && matchesDate;
    });
  }, [transactions, walletIdFilter, dateRange]);

  // Reset page to 1 when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [walletIdFilter, startDateStr, endDateStr]);

  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const isLoading = status === ReduxStatus.LOADING;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-black mb-1">Giao dịch ví điện tử</h1>
          <p className="text-sm text-gray-500">Quản lý và tra cứu lịch sử giao dịch của tất cả ví khách hàng</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 bg-white border border-[#EAEAEA] hover:bg-gray-50 text-black text-xs font-semibold px-4.5 py-2.5 rounded transition-colors disabled:opacity-50"
        >
          <PiArrowClockwiseBold className={isLoading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* KPI stats & Filters card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Tổng số giao dịch</p>
          <h3 className="text-2xl font-serif font-bold text-blue-600">{filteredTransactions.length}</h3>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Wallet ID Input */}
          <div className="relative flex-1 sm:flex-initial">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
              <PiMagnifyingGlassBold className="text-sm" />
            </span>
            <input
              type="text"
              placeholder="Lọc theo Wallet ID..."
              value={walletIdFilter}
              onChange={(e) => setWalletIdFilter(e.target.value)}
              className="w-full sm:w-60 rounded border border-[#EAEAEA] bg-white pl-9 pr-3 py-2 text-sm text-black focus:border-black focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="rounded border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              title="Từ ngày"
            />
            <span className="text-gray-400 text-xs">đến</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="rounded border border-[#EAEAEA] bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
              title="Đến ngày"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
        {isLoading && filteredTransactions.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã giao dịch</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Mã ví (Wallet ID)</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Loại giao dịch</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số tiền</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số dư trước</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Số dư sau</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Tham chiếu</th>
                    <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-4 px-6">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA]">
                  {paginatedTransactions.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.id} />
                      </td>
                      <td className="py-3.5 px-6">
                        <CopyableText text={record.walletId} />
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {record.typeName || "Không xác định"}
                      </td>
                      <td className="py-3.5 px-6">
                        <DirectionBadge record={record} />
                      </td>
                      <td className="py-3.5 px-6 text-gray-500">
                        {record.balanceBefore.toLocaleString()} ₫
                      </td>
                      <td className="py-3.5 px-6 font-semibold text-black">
                        {record.balanceAfter.toLocaleString()} ₫
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-mono text-gray-400 uppercase tracking-wider">{record.referenceType}</span>
                          <span className="font-medium text-black">{record.referenceId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-gray-500">
                        {dayjs(record.createdDate).format("DD/MM/YYYY HH:mm")}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        Không tìm thấy giao dịch nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Custom Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAEAEA] bg-gray-50 text-xs">
                <span className="text-gray-500 font-medium">
                  Hiển thị {Math.min(totalItems, (currentPage - 1) * pageSize + 1)} - {Math.min(totalItems, currentPage * pageSize)} trong tổng số {totalItems} giao dịch
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
    </div>
  );
}
