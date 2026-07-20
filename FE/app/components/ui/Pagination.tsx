import React from "react";
import { PiCaretLeftBold, PiCaretRightBold } from "react-icons/pi";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = "mục",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAEAEA] bg-gray-50 text-xs">
      <span className="text-gray-500 font-medium">
        Hiển thị {startItem} - {endItem} trong tổng số {totalItems} {itemName}
      </span>
      <div className="inline-flex gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#EAEAEA] bg-white rounded text-black font-semibold hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          <PiCaretLeftBold className="text-[10px]" />
          Trước
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#EAEAEA] bg-white rounded text-black font-semibold hover:bg-gray-100 disabled:opacity-40 transition-colors"
        >
          Sau
          <PiCaretRightBold className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}
