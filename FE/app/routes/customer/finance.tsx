import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyWallet,
  fetchMyTopups,
  fetchMyWithdraws,
  fetchMyBankAccounts,
  fetchSystemBankAccounts
} from "~/lib/feature/finance/financeThunk";
import { fetchKyc } from "~/lib/feature/customerProfile/customerProfileThunk";
import { selectKyc } from "~/lib/feature/customerProfile/customerProfileSelector";
import { KycStatus } from "~/lib/enums/finance";
import {
  selectWallet,
  selectTopups,
  selectWithdraws,
  selectFinanceStatus,
  selectBankAccounts,
  selectSystemBankAccounts
} from "~/lib/feature/finance/financeSelector";
import { formatVND } from "~/lib/utils/format";

import { TopupForm } from "~/components/finance/TopupForm";
import { WithdrawForm } from "~/components/finance/WithdrawForm";
import { TransactionHistoryTable } from "~/components/finance/TransactionHistoryTable";
import { SkeletonPanel, StatGroupSkeleton, Skeleton } from "~/components/shared/Skeleton";
import { ArrowDownLeft, ArrowUpRight, Bank, Clock, LockKey, Wallet, Warning, X } from "~/components/shared/icons";

/* ── Scroll Reveal Hook (IntersectionObserver) ── */
function useScrollReveal(deps: any[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const targets = container.querySelectorAll(".reveal-hidden");
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
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

function FinancePageSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white border border-slate-200/70 rounded-xl space-y-4">
          <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-7 rounded-md" /></div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-3/4 mt-4" />
        </div>
        <div className="p-6 bg-white border border-slate-200/70 rounded-xl space-y-4">
          <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-7 rounded-md" /></div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-3/4 mt-4" />
        </div>
        <div className="p-6 bg-white border border-slate-200/70 rounded-xl space-y-4">
          <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-7 rounded-md" /></div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-3/4 mt-4" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5"><SkeletonPanel rows={7} cols={1} /></div>
        <div className="lg:col-span-7"><SkeletonPanel rows={7} cols={5} /></div>
      </div>
    </>
  );
}

const FinancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet);
  const topups = useAppSelector(selectTopups);
  const withdraws = useAppSelector(selectWithdraws);
  const status = useAppSelector(selectFinanceStatus);
  const bankAccounts = useAppSelector(selectBankAccounts);
  const systemBankAccounts = useAppSelector(selectSystemBankAccounts) || [];
  const kyc = useAppSelector(selectKyc);

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const scrollRef = useScrollReveal([status, isInitialLoading]);

  const activeBankAccounts = bankAccounts.filter((b) => b.isActive);
  const activeSystemBankAccounts = systemBankAccounts.filter((b) => b.isActive);

  // Custom Page Tabs
  const [activeFormTab, setActiveFormTab] = useState<"topup" | "withdraw">("topup");
  const [activeHistoryTab, setActiveHistoryTab] = useState<"topup" | "withdraw">("topup");

  // Pagination states
  const [topupPage, setTopupPage] = useState(1);
  const [withdrawPage, setWithdrawPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    Promise.all([
      dispatch(fetchMyWallet()),
      dispatch(fetchMyTopups()),
      dispatch(fetchMyWithdraws()),
      dispatch(fetchMyBankAccounts()),
      dispatch(fetchSystemBankAccounts()),
      dispatch(fetchKyc())
    ]).finally(() => {
      setIsInitialLoading(false);
    });
  }, [dispatch]);

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
            <Bank className="text-base" />
            Tài khoản ngân hàng
          </Link>
        </div>

        {isInitialLoading ? (
          <FinancePageSkeleton />
        ) : (
          <>
        {/* ── Banners & Warnings ── */}

        {(!kyc || (kyc.status !== "Approved" && kyc.status !== KycStatus.Approved.toString())) && (
          <div className="reveal-hidden p-4 mb-8 text-sm flex items-start gap-3 rounded-lg border border-[#F8E3A1] bg-[#FBF3DB] text-[#956400]">
            <Warning className="text-lg shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Chưa hoàn thành Xác minh danh tính</p>
              <p className="mb-2">Bạn cần hoàn thành Xác minh danh tính để thực hiện giao dịch nạp và rút tiền.</p>
              <Link to="/profile" className="underline font-semibold hover:text-black">
                Xác minh ngay
              </Link>
            </div>
          </div>
        )}

        {bankAccounts.length === 0 && (
          <div className="reveal-hidden p-4 mb-8 text-sm flex items-start gap-3 rounded-lg border border-[#F8E3A1] bg-[#FBF3DB] text-[#956400]">
            <Warning className="text-lg shrink-0 mt-0.5" />
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
        <div className="relative group mb-10">
          {wallet?.isFrozen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/40 backdrop-blur-[2px] transition-all duration-300 cursor-not-allowed">
              <div className="w-16 h-16 rounded-full bg-white/90 shadow-sm flex items-center justify-center border border-gray-100 transition-transform duration-300 group-hover:scale-110">
                <LockKey className="text-3xl text-gray-700" />
              </div>
              
              <div className="absolute opacity-0 group-hover:opacity-100 transition-all duration-300 bottom-[15%] bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md shadow-lg pointer-events-none translate-y-2 group-hover:translate-y-0">
                Ví đang bị khóa do nghi ngờ gian lận
              </div>
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${wallet?.isFrozen ? 'opacity-80 pointer-events-none select-none' : ''}`}>
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
                  <Wallet style={{ color: "var(--mu-pastel-green-text)" }} />
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
                  <Warning style={{ color: "var(--mu-pastel-red-text)" }} />
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
                  <Wallet style={{ color: "var(--mu-pastel-blue-text)" }} />
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
                onClick={() => setActiveFormTab("topup")}
                className={`flex-1 py-1.5 text-base font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${activeFormTab === "topup"
                  ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-black"
                  : "text-gray-400 hover:text-black"
                  }`}
              >
                <ArrowUpRight className="text-sm" />
                Nạp tiền
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab("withdraw")}
                className={`flex-1 py-1.5 text-base font-semibold rounded-md transition-all inline-flex items-center justify-center gap-1.5 ${activeFormTab === "withdraw"
                  ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] text-black"
                  : "text-gray-400 hover:text-black"
                  }`}
              >
                <ArrowDownLeft className="text-sm" />
                Rút tiền
              </button>
            </div>

            {/* TAB CONTENT: TOPUP */}
            {activeFormTab === "topup" && (
              <TopupForm 
                kyc={kyc}
                status={status}
                wallet={wallet}
                activeSystemBankAccounts={activeSystemBankAccounts}
              />
            )}

            {/* TAB CONTENT: WITHDRAW */}
            {activeFormTab === "withdraw" && (
              <WithdrawForm 
                kyc={kyc}
                status={status}
                wallet={wallet}
                activeBankAccounts={activeBankAccounts}
              />
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
                  <Clock className="text-lg text-gray-400" />
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

            <TransactionHistoryTable
              activeHistoryTab={activeHistoryTab}
              topups={topups}
              withdraws={withdraws}
              topupPage={topupPage}
              setTopupPage={setTopupPage}
              withdrawPage={withdrawPage}
              setWithdrawPage={setWithdrawPage}
              itemsPerPage={ITEMS_PER_PAGE}
            />
            
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
