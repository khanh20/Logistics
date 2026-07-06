import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyWallet,
  fetchMyTopups,
  fetchMyWithdraws,
  submitTopup,
  submitWithdraw,
  fetchMyBankAccounts,
  fetchSystemBankAccounts,
  createZaloPayPayment
} from "~/lib/feature/finance/financeThunk";
import {
  selectWallet,
  selectTopups,
  selectWithdraws,
  selectFinanceStatus,
  selectFinanceError,
  selectBankAccounts,
  selectSystemBankAccounts
} from "~/lib/feature/finance/financeSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { TOPUP_STATUS_LABELS, WITHDRAW_STATUS_LABELS } from "~/lib/constants/finance";
import { TopupStatusEnum, WithdrawStatusEnum } from "~/lib/enums/finance";
import { formatVND, formatDate } from "~/lib/utils/format";

import {
  PiWalletBold,
  PiArrowUpRightBold,
  PiArrowDownLeftBold,
  PiClockBold,
  PiBankBold,
  PiWarningBold,
  PiInfoBold,
  PiCaretLeftBold,
  PiCaretRightBold,
  PiCheckCircleBold,
  PiPlusBold
} from "react-icons/pi";

/* ── Scroll Reveal Hook (IntersectionObserver) ── */
function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll(".reveal-hidden");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return containerRef;
}

const FinancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet);
  const topups = useAppSelector(selectTopups);
  const withdraws = useAppSelector(selectWithdraws);
  const status = useAppSelector(selectFinanceStatus);
  const error = useAppSelector(selectFinanceError);
  const bankAccounts = useAppSelector(selectBankAccounts);
  const systemBankAccounts = useAppSelector(selectSystemBankAccounts) || [];

  const scrollRef = useScrollReveal();

  const activeBankAccounts = bankAccounts.filter((b) => b.isActive);
  const activeSystemBankAccounts = systemBankAccounts.filter((b) => b.isActive);

  // Custom Page Tabs
  const [activeFormTab, setActiveFormTab] = useState<"topup" | "withdraw">("topup");
  const [activeHistoryTab, setActiveHistoryTab] = useState<"topup" | "withdraw">("topup");

  // Form states
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupSystemBankId, setTopupSystemBankId] = useState<string>("");
  const [topupValidationError, setTopupValidationError] = useState<string | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [withdrawUserBankId, setWithdrawUserBankId] = useState<string>("");
  const [withdrawValidationError, setWithdrawValidationError] = useState<string | null>(null);

  // Pagination states
  const [topupPage, setTopupPage] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    dispatch(fetchMyWallet());
    dispatch(fetchMyTopups());
    dispatch(fetchMyWithdraws());
    dispatch(fetchMyBankAccounts());
    dispatch(fetchSystemBankAccounts());
  }, [dispatch]);

  const handleZaloPayPayment = async (topupId: string) => {
    try {
      const res = await dispatch(createZaloPayPayment(topupId)).unwrap();
      if (res && res.payUrl) {
        window.open(res.payUrl, "_blank");
      } else {
        toast.error("Không nhận được URL thanh toán");
      }
    } catch (err: any) {
      toast.error(err || "Lỗi tạo thanh toán ZaloPay");
    }
  };

  const onTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupSystemBankId) {
      setTopupValidationError("Vui lòng chọn tài khoản ngân hàng hệ thống");
      return;
    }
    if (!topupAmount || typeof topupAmount !== "number") {
      setTopupValidationError("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (topupAmount < 10000) {
      setTopupValidationError("Số tiền tối thiểu là 10.000₫");
      return;
    }

    setTopupValidationError(null);
    try {
      await dispatch(
        submitTopup({
          amount: topupAmount,
          bankAccountId: topupSystemBankId
        })
      ).unwrap();
      toast.success("Yêu cầu nạp tiền đã được gửi!");
      setTopupAmount("");
      setTopupSystemBankId("");
    } catch (err: any) {
      toast.error(err || "Không thể gửi yêu cầu nạp tiền");
    }
  };

  const onWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawUserBankId) {
      setWithdrawValidationError("Vui lòng chọn tài khoản ngân hàng nhận tiền");
      return;
    }
    if (!withdrawAmount || typeof withdrawAmount !== "number") {
      setWithdrawValidationError("Vui lòng nhập số tiền rút hợp lệ");
      return;
    }
    if (withdrawAmount < 50000) {
      setWithdrawValidationError("Số tiền rút tối thiểu là 50.000₫");
      return;
    }
    if (wallet && withdrawAmount > wallet.availableBalance) {
      setWithdrawValidationError("Số dư khả dụng không đủ");
      return;
    }

    setWithdrawValidationError(null);
    try {
      await dispatch(
        submitWithdraw({
          amount: withdrawAmount,
          bankAccountId: withdrawUserBankId
        })
      ).unwrap();
      toast.success("Yêu cầu rút tiền đã được gửi!");
      setWithdrawAmount("");
      setWithdrawUserBankId("");
    } catch (err: any) {
      toast.error(err || "Không thể gửi yêu cầu rút tiền");
    }
  };

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

  // Paginated Data
  const paginatedTopups = topups.slice(
    (topupPage - 1) * ITEMS_PER_PAGE,
    topupPage * ITEMS_PER_PAGE
  );
  const totalTopupPages = Math.ceil(topups.length / ITEMS_PER_PAGE);

  const paginatedWithdraws = withdraws.slice(
    (withdrawPage - 1) * ITEMS_PER_PAGE,
    withdrawPage * ITEMS_PER_PAGE
  );
  const totalWithdrawPages = Math.ceil(withdraws.length / ITEMS_PER_PAGE);



  return (
    <div
      ref={scrollRef}
      className="min-h-screen py-12 px-6 sm:px-8"
      style={{ backgroundColor: "var(--mu-canvas)" }}
    >
      <div className="mx-auto max-w-5xl">
        {/* ── Header ── */}
        <div className="reveal-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-[#EAEAEA]">
          <div>
            <h1
              className="font-serif text-3xl font-bold tracking-tight mb-2"
              style={{ color: "var(--mu-text)" }}
            >
              Quản lý tài chính
            </h1>
            <p className="text-sm" style={{ color: "var(--mu-text-secondary)" }}>
              Quản lý số dư, yêu cầu nạp tiền và rút tiền của bạn.
            </p>
          </div>
          <Link
            to="/bank-accounts"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white hover:bg-gray-50 active:scale-[0.98]"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "6px",
              color: "var(--mu-text)"
            }}
          >
            <PiBankBold className="text-base" />
            Tài khoản ngân hàng
          </Link>
        </div>

        {/* ── Banners & Warnings ── */}
        {error && (
          <div className="reveal-hidden p-4 mb-6 text-sm flex items-start gap-3 rounded-lg border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
            <PiWarningBold className="text-lg shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {bankAccounts.length === 0 && (
          <div className="reveal-hidden p-4 mb-8 text-sm flex items-start gap-3 rounded-lg border border-[#F8E3A1] bg-[#FBF3DB] text-[#956400]">
            <PiWarningBold className="text-lg shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Chưa có tài khoản ngân hàng liên kết</p>
              <p className="mb-2">Bạn cần thêm tài khoản ngân hàng cá nhân để thực hiện giao dịch nạp và rút tiền.</p>
              <Link to="/bank-accounts" className="underline font-semibold hover:text-black">
                Thêm tài khoản ngay
              </Link>
            </div>
          </div>
        )}

        {/* ── SECTION 1: Bento Balance Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Available Balance (Emphasized) */}
          <div
            className="reveal-hidden md:col-span-1 p-6 flex flex-col justify-between transition-shadow duration-200 bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "50ms"
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-mono uppercase tracking-wider" style={{ color: "var(--mu-text-secondary)" }}>
                  Số dư khả dụng
                </span>
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-md"
                  style={{ backgroundColor: "var(--mu-pastel-green-bg)" }}
                >
                  <PiWalletBold style={{ color: "var(--mu-pastel-green-text)" }} />
                </div>
              </div>
              <div
                className="font-serif text-3xl font-bold tracking-tight mb-2"
                style={{ color: "var(--mu-pastel-green-text)" }}
              >
                {wallet ? formatVND(wallet.availableBalance) : "0₫"}
              </div>
            </div>
            <p className="text-sm mt-4" style={{ color: "var(--mu-text-secondary)" }}>
              Sử dụng để thanh toán đơn hàng trực tiếp trên hệ thống
            </p>
          </div>

          {/* Card 2: Frozen Balance */}
          <div
            className="reveal-hidden p-6 flex flex-col justify-between transition-shadow duration-200 bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "150ms"
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-mono uppercase tracking-wider" style={{ color: "var(--mu-text-secondary)" }}>
                  Số dư tạm giữ
                </span>
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-md"
                  style={{ backgroundColor: "var(--mu-pastel-red-bg)" }}
                >
                  <PiWarningBold style={{ color: "var(--mu-pastel-red-text)" }} />
                </div>
              </div>
              <div
                className="font-serif text-3xl font-bold tracking-tight mb-2"
                style={{ color: "var(--mu-pastel-red-text)" }}
              >
                {wallet ? formatVND(wallet.frozenBalance) : "0₫"}
              </div>
            </div>
            <p className="text-sm mt-4" style={{ color: "var(--mu-text-secondary)" }}>
              Số tiền đang bị khóa do các giao dịch hoặc tranh chấp đang xử lý
            </p>
          </div>

          {/* Card 3: Total Balance */}
          <div
            className="reveal-hidden p-6 flex flex-col justify-between transition-shadow duration-200 bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "250ms"
            }}
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-mono uppercase tracking-wider" style={{ color: "var(--mu-text-secondary)" }}>
                  Tổng số dư
                </span>
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-md"
                  style={{ backgroundColor: "var(--mu-pastel-blue-bg)" }}
                >
                  <PiWalletBold style={{ color: "var(--mu-pastel-blue-text)" }} />
                </div>
              </div>
              <div
                className="font-serif text-3xl font-bold tracking-tight mb-2"
                style={{ color: "var(--mu-text)" }}
              >
                {wallet ? formatVND(wallet.totalBalance) : "0₫"}
              </div>
            </div>
            <p className="text-sm mt-4" style={{ color: "var(--mu-text-secondary)" }}>
              Tổng lượng tài sản lưu giữ của bạn trên hệ thống MuaHo
            </p>
          </div>
        </div>

        {/* ── SECTION 2: Forms & History Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Transaction Forms */}
          <div
            className="reveal-hidden lg:col-span-5 p-6 bg-white transition-shadow duration-200"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "100ms"
            }}
          >
            {/* Custom Tab Header */}
            <div className="flex p-1 bg-gray-100/80 rounded-lg border border-[#EAEAEA] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveFormTab("topup");
                  setTopupValidationError(null);
                }}
                className={`flex-1 py-1.5 text-base font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${activeFormTab === "topup"
                    ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-black"
                    : "text-gray-400 hover:text-black"
                  }`}
              >
                <PiArrowUpRightBold className="text-sm" />
                Nạp tiền
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFormTab("withdraw");
                  setWithdrawValidationError(null);
                }}
                className={`flex-1 py-1.5 text-base font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${activeFormTab === "withdraw"
                    ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-black"
                    : "text-gray-400 hover:text-black"
                  }`}
              >
                <PiArrowDownLeftBold className="text-sm" />
                Rút tiền
              </button>
            </div>

            {/* TAB CONTENT: TOPUP */}
            {activeFormTab === "topup" && (
              <form onSubmit={onTopupSubmit} className="space-y-5">
                {topupValidationError && (
                  <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                    {topupValidationError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                    Tài khoản ngân hàng của hệ thống
                  </label>
                  <div className="relative">
                    <select
                      value={topupSystemBankId}
                      onChange={(e) => setTopupSystemBankId(e.target.value)}
                      disabled={activeSystemBankAccounts.length === 0}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
                    >
                      <option value="">-- Chọn tài khoản ngân hàng --</option>
                      {activeSystemBankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber} ({b.accountHolder})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <PiBankBold />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                    Số tiền muốn nạp (VND)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      placeholder="0"
                      min={10000}
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white pl-3 pr-12 py-2 text-base text-black focus:border-black focus:outline-none"
                    />
                    <span className="absolute right-3 text-sm font-mono text-gray-400">VND</span>
                  </div>
                  <span className="text-sm text-gray-400 block mt-1">
                    Gợi ý: Bước nạp tối thiểu 10.000₫
                  </span>
                </div>

                <div className="p-3.5 rounded-lg border border-[#D1E7DD] bg-[#EDF3EC] text-[#346538] text-sm flex gap-2">
                  <PiInfoBold className="text-base shrink-0 mt-0.5" />
                  <span>
                    Sau khi tạo yêu cầu, hãy thực hiện chuyển khoản đúng theo thông tin tài khoản hiển thị trong danh sách giao dịch bên phải.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={status === ReduxStatus.LOADING}
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 text-base font-semibold text-white bg-[#111111] hover:bg-[#2F3437] rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400 disabled:pointer-events-none"
                >
                  {status === ReduxStatus.LOADING ? "Đang xử lý..." : "Tạo yêu cầu nạp tiền"}
                </button>
              </form>
            )}

            {/* TAB CONTENT: WITHDRAW */}
            {activeFormTab === "withdraw" && (
              <form onSubmit={onWithdrawSubmit} className="space-y-5">
                {withdrawValidationError && (
                  <div className="p-3 text-sm rounded border border-[#F5C2C7] bg-[#FDEBEC] text-[#9F2F2D]">
                    {withdrawValidationError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                    Tài khoản nhận tiền (Tài khoản của bạn)
                  </label>
                  <div className="relative">
                    <select
                      value={withdrawUserBankId}
                      onChange={(e) => setWithdrawUserBankId(e.target.value)}
                      disabled={activeBankAccounts.length === 0}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white px-3 py-2 text-base text-black focus:border-black focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
                    >
                      <option value="">-- Chọn tài khoản ngân hàng --</option>
                      {activeBankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber} ({b.accountHolder})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <PiBankBold />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-mono uppercase tracking-wider text-gray-500 mb-2">
                    Số tiền muốn rút (VND)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      placeholder="0"
                      min={50000}
                      step={100000}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="block w-full rounded-md border border-[#EAEAEA] bg-white pl-3 pr-12 py-2 text-base text-black focus:border-black focus:outline-none"
                    />
                    <span className="absolute right-3 text-sm font-mono text-gray-400">VND</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-400 mt-1">
                    <span>Bước rút tối thiểu 50.000₫</span>
                    <span>
                      Khả dụng:{" "}
                      <span className="font-semibold text-gray-600">
                        {wallet ? wallet.availableBalance.toLocaleString() : "0"}₫
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={status === ReduxStatus.LOADING}
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 text-base font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors active:scale-[0.98] disabled:bg-gray-400 disabled:pointer-events-none"
                >
                  {status === ReduxStatus.LOADING ? "Đang xử lý..." : "Tạo yêu cầu rút tiền"}
                </button>
              </form>
            )}
          </div>

          {/* Right: Transaction History */}
          <div
            className="reveal-hidden lg:col-span-7 p-6 bg-white transition-shadow duration-200"
            style={{
              border: "1px solid var(--mu-border)",
              borderRadius: "12px",
              transitionDelay: "200ms"
            }}
          >
            {/* Header and inner Sub-tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base font-semibold text-black flex items-center gap-2">
                  <PiClockBold className="text-lg text-gray-400" />
                  Lịch sử giao dịch
                </h2>
                <Link
                  to="/finance/history"
                  className="inline-flex items-center text-xs font-mono uppercase tracking-widest text-neutral-500 hover:text-neutral-900 border-b border-transparent hover:border-neutral-950 pb-0.5 transition-all"
                >
                  Biến động số dư →
                </Link>
              </div>
            </div>

            <div className="flex border-b border-gray-100 text-sm font-medium mb-6">
              <button
                onClick={() => setActiveHistoryTab("topup")}
                className={`pb-2 px-3 border-b-2 transition-all ${activeHistoryTab === "topup"
                    ? "border-black text-black font-semibold"
                    : "border-transparent text-gray-400 hover:text-black"
                  }`}
              >
                Yêu cầu Nạp
              </button>
              <button
                onClick={() => setActiveHistoryTab("withdraw")}
                className={`pb-2 px-3 border-b-2 transition-all ${activeHistoryTab === "withdraw"
                    ? "border-black text-black font-semibold"
                    : "border-transparent text-gray-400 hover:text-black"
                  }`}
              >
                Yêu cầu Rút
              </button>
            </div>

            {/* TAB HISTORY CONTENT: TOPUP */}
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
                                {TOPUP_STATUS_LABELS[record.status] || record.status}
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

                {/* Pagination */}
                {totalTopupPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[#EAEAEA] pt-4 mt-2">
                    <span className="text-sm text-gray-400 font-mono">
                      Trang {topupPage} / {totalTopupPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTopupPage((p) => Math.max(p - 1, 1))}
                        disabled={topupPage === 1}
                        className="p-1 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <PiCaretLeftBold />
                      </button>
                      <button
                        onClick={() => setTopupPage((p) => Math.min(p + 1, totalTopupPages))}
                        disabled={topupPage === totalTopupPages}
                        className="p-1 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <PiCaretRightBold />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB HISTORY CONTENT: WITHDRAW */}
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
                                {WITHDRAW_STATUS_LABELS[record.status] || record.status}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">
                              <span className="font-medium text-gray-700">{record.bankName}</span>
                              <span className="block text-sm font-mono text-gray-400">
                                {record.bankAccountNo}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalWithdrawPages > 1 && (
                  <div className="flex items-center justify-between border-t border-[#EAEAEA] pt-4 mt-2">
                    <span className="text-sm text-gray-400 font-mono">
                      Trang {withdrawPage} / {totalWithdrawPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWithdrawPage((p) => Math.max(p - 1, 1))}
                        disabled={withdrawPage === 1}
                        className="p-1 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <PiCaretLeftBold />
                      </button>
                      <button
                        onClick={() => setWithdrawPage((p) => Math.min(p + 1, totalWithdrawPages))}
                        disabled={withdrawPage === totalWithdrawPages}
                        className="p-1 rounded border border-[#EAEAEA] hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                      >
                        <PiCaretRightBold />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancePage;
