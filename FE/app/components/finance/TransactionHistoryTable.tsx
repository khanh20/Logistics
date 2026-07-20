import React from "react";
import { TopupStatusEnum, WithdrawStatusEnum } from "~/lib/enums/finance";
import { TOPUP_STATUS_LABELS, WITHDRAW_STATUS_LABELS } from "~/lib/constants/finance";
import { formatVND, formatDate } from "~/lib/utils/format";
import { Pagination } from "~/components/ui/Pagination";
import { createZaloPayPayment } from "~/lib/feature/finance/financeThunk";
import { useAppDispatch } from "~/lib/feature/hooks";
import { toast } from "react-toastify";

interface TransactionHistoryTableProps {
  activeHistoryTab: "topup" | "withdraw";
  topups: any[];
  withdraws: any[];
  topupPage: number;
  setTopupPage: (page: number) => void;
  withdrawPage: number;
  setWithdrawPage: (page: number) => void;
  itemsPerPage: number;
}

export const TransactionHistoryTable: React.FC<TransactionHistoryTableProps> = ({
  activeHistoryTab,
  topups,
  withdraws,
  topupPage,
  setTopupPage,
  withdrawPage,
  setWithdrawPage,
  itemsPerPage,
}) => {
  const dispatch = useAppDispatch();

  const getTopupStatusStyles = (status: TopupStatusEnum) => {
    switch (status) {
      case TopupStatusEnum.Pending:
        return "bg-[#FBF3DB] text-[#956400] border border-[#F8E3A1]";
      case TopupStatusEnum.Matched:
        return "bg-[#EDF3EC] text-[#346538] border border-[#D1E7DD]";
      case TopupStatusEnum.Cancelled:
      case TopupStatusEnum.Expired:
        return "bg-[#FDEBEC] text-[#9F2F2D] border border-[#F5C2C7]";
      default:
        return "bg-gray-100 text-gray-500 border border-gray-200";
    }
  };

  const getWithdrawStatusStyles = (status: WithdrawStatusEnum) => {
    switch (status) {
      case WithdrawStatusEnum.Pending:
      case WithdrawStatusEnum.Processing:
        return "bg-[#FBF3DB] text-[#956400] border border-[#F8E3A1]";
      case WithdrawStatusEnum.Approved:
      case WithdrawStatusEnum.Completed:
        return "bg-[#EDF3EC] text-[#346538] border border-[#D1E7DD]";
      case WithdrawStatusEnum.Rejected:
      case WithdrawStatusEnum.Cancelled:
        return "bg-[#FDEBEC] text-[#9F2F2D] border border-[#F5C2C7]";
      default:
        return "bg-gray-100 text-gray-500 border border-gray-200";
    }
  };

  const handleZaloPayPayment = async (topupId: string) => {
    try {
      const res = await dispatch(createZaloPayPayment(topupId)).unwrap();
      if (res && res.payUrl) {
        window.open(res.payUrl, "_blank");
      } else {
        toast.error("Không nhận được URL thanh toán");
      }
    } catch (err: unknown) {
      toast.error((err as string) || "Lỗi tạo thanh toán ZaloPay");
    }
  };

  const paginatedTopups = topups.slice(
    (topupPage - 1) * itemsPerPage,
    topupPage * itemsPerPage
  );
  const totalTopupPages = Math.ceil(topups.length / itemsPerPage);

  const paginatedWithdraws = withdraws.slice(
    (withdrawPage - 1) * itemsPerPage,
    withdrawPage * itemsPerPage
  );
  const totalWithdrawPages = Math.ceil(withdraws.length / itemsPerPage);

  return (
    <>
      {activeHistoryTab === "topup" && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAEAEA]">
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Ngày tạo
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Số tiền
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Trạng thái
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Nội dung
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {paginatedTopups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 font-mono">
                      Chưa có giao dịch nạp tiền nào
                    </td>
                  </tr>
                ) : (
                  paginatedTopups.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 text-gray-600 font-mono">
                        {formatDate(record.createdDate || "")}
                      </td>
                      <td className="py-3 font-semibold text-gray-900">
                        {formatVND(record.amountVnd)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 text-sm font-mono uppercase tracking-wider rounded-full inline-block ${getTopupStatusStyles(
                            record.status
                          )}`}
                        >
                          {TOPUP_STATUS_LABELS[record.status as keyof typeof TOPUP_STATUS_LABELS] || record.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 font-mono break-all max-w-[120px]">
                        {record.transferContent || "---"}
                      </td>
                      <td className="py-3 text-right">
                        {record.status === TopupStatusEnum.Pending && (
                          <button
                            type="button"
                            onClick={() => handleZaloPayPayment(record.id)}
                            className="px-2 py-1 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors active:scale-[0.96]"
                          >
                            ZaloPay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalTopupPages > 1 && (
            <div className="mt-4 border-t border-[#EAEAEA] pt-4">
              <Pagination
                currentPage={topupPage}
                totalPages={totalTopupPages}
                totalItems={topups.length}
                pageSize={itemsPerPage}
                onPageChange={setTopupPage}
                itemName="yêu cầu"
              />
            </div>
          )}
        </div>
      )}

      {activeHistoryTab === "withdraw" && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EAEAEA]">
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Ngày tạo
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Số tiền
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Trạng thái
                  </th>
                  <th className="font-mono text-sm uppercase tracking-wider text-gray-400 pb-3 font-semibold">
                    Ngân hàng
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {paginatedWithdraws.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 font-mono">
                      Chưa có giao dịch rút tiền nào
                    </td>
                  </tr>
                ) : (
                  paginatedWithdraws.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 text-gray-600 font-mono">
                        {formatDate(record.createdDate || "")}
                      </td>
                      <td className="py-3 font-semibold text-gray-900">
                        {formatVND(record.amountVnd)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 text-sm font-mono uppercase tracking-wider rounded-full inline-block ${getWithdrawStatusStyles(
                            record.status
                          )}`}
                        >
                          {WITHDRAW_STATUS_LABELS[record.status as keyof typeof WITHDRAW_STATUS_LABELS] || record.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 font-mono break-all max-w-[200px]">
                        {record.bankName} - {record.accountNumber} ({record.accountHolder})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalWithdrawPages > 1 && (
            <div className="mt-4 border-t border-[#EAEAEA] pt-4">
              <Pagination
                currentPage={withdrawPage}
                totalPages={totalWithdrawPages}
                totalItems={withdraws.length}
                pageSize={itemsPerPage}
                onPageChange={setWithdrawPage}
                itemName="yêu cầu"
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
