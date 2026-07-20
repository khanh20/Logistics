import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import dayjs from "dayjs";
import {
  PiBankBold,
  PiWarningBold,
  PiArrowClockwiseBold,
  PiScalesBold,
  PiArrowRightBold,
  PiCopyBold,
  PiCheckBold
} from "react-icons/pi";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchPendingWithdraws,
  fetchRefunds,
  fetchFraudCases,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  WithdrawStatusEnum,
  RefundStatusEnum,
  FraudStatusEnum,
  FraudActionEnum,
  FraudTypeEnum,
} from "~/lib/enums/finance";
import {
  WITHDRAW_STATUS_LABELS,
  WITHDRAW_STATUS_COLORS,
  FRAUD_STATUS_LABELS,
  FRAUD_STATUS_COLORS,
  FRAUD_TYPE_LABELS,
  FRAUD_ACTION_LABELS,
} from "~/lib/constants/finance";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import type { FraudDetectionDto } from "~/lib/types/adminFinance";
import { ReduxStatus } from "~/lib/feature/const";

function StatusBadge({ status, label, colorsMap }: { status: string | number; label: string; colorsMap: Record<string | number, string> }) {
  const color = colorsMap[status] || "default";
  let classes = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ";
  if (color === "success") {
    classes += "bg-green-50 text-green-700 border-green-200/60";
  } else if (color === "processing" || color === "blue" || color === "cyan") {
    classes += "bg-blue-50 text-blue-700 border-blue-200/60";
  } else if (color === "warning") {
    classes += "bg-amber-50 text-amber-700 border-amber-200/60";
  } else if (color === "error") {
    classes += "bg-rose-50 text-rose-700 border-rose-200/60";
  } else {
    classes += "bg-gray-50 text-gray-700 border-gray-200/60";
  }
  return <span className={classes}>{label}</span>;
}

function CopyableText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1 group font-mono text-sm text-[#2F3437]">
      <span>{text.substring(0, 8)}</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
        title="Copy"
      >
        {copied ? <PiCheckBold className="text-green-600" /> : <PiCopyBold />}
      </button>
    </div>
  );
}

export default function AdminFinanceDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { pendingWithdraws, refunds, fraudCases, status } = useAppSelector(
    (state) => state.adminFinanceState
  );

  useEffect(() => {
    dispatch(fetchPendingWithdraws());
    dispatch(fetchRefunds());
    dispatch(fetchFraudCases());
  }, [dispatch]);

  const pendingWithdrawCount = useMemo(() => {
    return pendingWithdraws.filter((w) => w.status === WithdrawStatusEnum.Pending).length;
  }, [pendingWithdraws]);

  const pendingRefundCount = useMemo(() => {
    return refunds.filter((r) => r.status === RefundStatusEnum.Pending).length;
  }, [refunds]);

  const openFraudCount = useMemo(() => {
    return fraudCases.filter(
      (f) =>
        f.status === FraudStatusEnum.Open ||
        f.status === FraudStatusEnum.Investigating
    ).length;
  }, [fraudCases]);

  const isLoading = status === ReduxStatus.LOADING;

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-black mb-1">Tổng quan Tài chính</h1>
        <p className="text-sm text-gray-500">Quản lý giao dịch, đối soát và các vấn đề bất thường</p>
      </div>

      {isLoading && pendingWithdraws.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI 1 */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Yêu cầu rút tiền</p>
                  <h3 className="text-3xl font-serif font-bold text-black">{pendingWithdrawCount}</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100/50">
                  <PiBankBold className="text-xl" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex justify-between items-center">
                <span className="text-xs text-gray-400">yêu cầu chờ duyệt</span>
                <Link to="/admin/finance/withdraws" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                  Chi tiết <PiArrowRightBold />
                </Link>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Yêu cầu hoàn tiền</p>
                  <h3 className="text-3xl font-serif font-bold text-black">{pendingRefundCount}</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100/50">
                  <PiArrowClockwiseBold className="text-xl" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex justify-between items-center">
                <span className="text-xs text-gray-400">yêu cầu cần xử lý</span>
                <Link to="/admin/finance/refunds" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
                  Chi tiết <PiArrowRightBold />
                </Link>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Cảnh báo gian lận</p>
                  <h3 className="text-3xl font-serif font-bold text-black">{openFraudCount}</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100/50">
                  <PiWarningBold className="text-xl" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex justify-between items-center">
                <span className="text-xs text-gray-400">vấn đề chưa giải quyết</span>
                <Link to="/admin/finance/fraud" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors">
                  Chi tiết <PiArrowRightBold />
                </Link>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg p-6 flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Báo cáo doanh thu</p>
                  <h3 className="text-3xl font-serif font-bold text-black">Live</h3>
                </div>
                <div className="p-2.5 rounded-lg bg-green-50 text-green-600 border border-green-100/50">
                  <PiScalesBold className="text-xl" />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#EAEAEA] flex justify-between items-center">
                <span className="text-xs text-gray-400">cập nhật hàng ngày</span>
                <Link to="/admin/finance/revenue" className="text-xs font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors">
                  Chi tiết <PiArrowRightBold />
                </Link>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Table 1: Recent Withdrawals */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
                <div className="flex items-center gap-2">
                  <PiBankBold className="text-lg text-blue-500" />
                  <span className="text-base font-semibold text-black">Rút tiền gần đây</span>
                </div>
                <Link to="/admin/finance/withdraws" className="text-xs font-semibold text-gray-500 hover:text-black">
                  Tất cả
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Mã GD</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Khách hàng</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Số tiền</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Ngày tạo</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]">
                    {pendingWithdraws.slice(0, 5).map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <CopyableText text={w.id} />
                        </td>
                        <td className="py-3 px-6 font-medium text-black">
                          {w.accountHolder}
                        </td>
                        <td className="py-3 px-6 text-black font-semibold">
                          {w.amountVnd ? `${w.amountVnd.toLocaleString()} ₫` : "-"}
                        </td>
                        <td className="py-3 px-6 text-gray-500">
                          {w.createdDate ? dayjs(w.createdDate).format("DD/MM/YYYY HH:mm") : "-"}
                        </td>
                        <td className="py-3 px-6">
                          <StatusBadge
                            status={w.status}
                            label={WITHDRAW_STATUS_LABELS[w.status]}
                            colorsMap={WITHDRAW_STATUS_COLORS}
                          />
                        </td>
                      </tr>
                    ))}
                    {pendingWithdraws.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400">
                          Không có giao dịch rút tiền nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: New Fraud Alerts */}
            <div className="bg-white border border-[#EAEAEA] rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
                <div className="flex items-center gap-2">
                  <PiWarningBold className="text-lg text-rose-500" />
                  <span className="text-base font-semibold text-black">Cảnh báo gian lận mới</span>
                </div>
                <Link to="/admin/finance/fraud" className="text-xs font-semibold text-gray-500 hover:text-black">
                  Tất cả
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#EAEAEA]">
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Mã KH</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Loại vi phạm</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Điểm rủi ro</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Hành động</th>
                      <th className="font-mono text-xs uppercase text-gray-400 tracking-wider py-3.5 px-6">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA]">
                    {fraudCases
                      .filter(f => f.status === FraudStatusEnum.Open || f.status === FraudStatusEnum.Investigating)
                      .slice(0, 5)
                      .map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6">
                            <CopyableText text={f.customerId} />
                          </td>
                          <td className="py-3 px-6 text-black font-medium">
                            {FRAUD_TYPE_LABELS[f.fraudType as FraudTypeEnum] || "Khác"}
                          </td>
                          <td className="py-3 px-6 font-semibold">
                            <span className={f.riskScore > 80 ? "text-rose-600" : f.riskScore > 50 ? "text-amber-600" : "text-gray-500"}>
                              {f.riskScore}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200">
                              {FRAUD_ACTION_LABELS[f.action as FraudActionEnum] || "Không xác định"}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <StatusBadge
                              status={f.status}
                              label={FRAUD_STATUS_LABELS[f.status]}
                              colorsMap={FRAUD_STATUS_COLORS}
                            />
                          </td>
                        </tr>
                      ))}
                    {fraudCases.filter(f => f.status === FraudStatusEnum.Open || f.status === FraudStatusEnum.Investigating).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400">
                          Không có cảnh báo gian lận nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
