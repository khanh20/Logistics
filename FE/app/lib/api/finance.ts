// ═══════════════════════════════════════════════════════════════════
// Finance API — Customer wallet, topup, withdraw, ZaloPay
// ═══════════════════════════════════════════════════════════════════

import { apiModule3Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  WalletDto,
  TopupResponseDto,
  CreateTopupDto,
  WithdrawResponseDto,
  CreateWithdrawDto,
  PaymentLockDto,
  WalletTransactionDto,
  DailyRevenueReport,
} from "~/lib/types/finance";

export const financeApi = {
  // ── Wallet ───────────────────────────────────────────────────
  getMyWallet: () =>
    apiModule3Client.get<unknown, ApiResponse<WalletDto>>("/api/transactions/my-wallet"),

  getMyHistory: () =>
    apiModule3Client.get<unknown, ApiResponse<WalletTransactionDto[]>>("/api/transactions/my-history"),

  // ── Topup ────────────────────────────────────────────────────
  getMyTopups: () =>
    apiModule3Client.get<unknown, ApiResponse<TopupResponseDto[]>>("/api/transactions/my-topups"),

  createTopup: (data: CreateTopupDto) =>
    apiModule3Client.post<unknown, ApiResponse<TopupResponseDto>>("/api/transactions/topup", data),

  // ── Withdraw ─────────────────────────────────────────────────
  getMyWithdraws: () =>
    apiModule3Client.get<unknown, ApiResponse<WithdrawResponseDto[]>>("/api/transactions/my-withdraws"),

  createWithdraw: (data: CreateWithdrawDto) =>
    apiModule3Client.post<unknown, ApiResponse<WithdrawResponseDto>>("/api/transactions/withdraw", data),

  // ── ZaloPay ──────────────────────────────────────────────────
  createZaloPayPayment: (topupId: string) =>
    apiModule3Client.post<unknown, ApiResponse<{ payUrl: string; zpTransToken: string; orderToken: string }>>(
      `/api/zalopay/create-payment/${topupId}`
    ),

  // ── Payment Lock ─────────────────────────────────────────────
  getPaymentLocksByOrder: (orderId: string) =>
    apiModule3Client.get<unknown, ApiResponse<PaymentLockDto[]>>(`/api/PaymentLock/order/${orderId}`),

  searchPaymentLocks: (params: { status?: number; orderId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params.status !== undefined) query.append("status", params.status.toString());
    if (params.orderId) query.append("orderId", params.orderId);
    if (params.page) query.append("page", params.page.toString());
    if (params.pageSize) query.append("pageSize", params.pageSize.toString());
    
    return apiModule3Client.get<unknown, ApiResponse<{ items: PaymentLockDto[]; total: number; page: number; pageSize: number }>>(`/api/PaymentLock/search?${query.toString()}`);
  },

  releasePaymentLock: (id: string, reason: string) =>
    apiModule3Client.post<unknown, ApiResponse<PaymentLockDto>>(`/api/PaymentLock/${id}/release?reason=${reason}`),

  // ── Bank Account ─────────────────────────────────────────────
  getMyBankAccounts: () =>
    apiModule3Client.get<unknown, ApiResponse<any[]>>("/api/bank-accounts/my"),

  createBankAccount: (data: any) =>
    apiModule3Client.post<unknown, ApiResponse<any>>("/api/bank-accounts", data),

  deleteBankAccount: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<any>>(`/api/bank-accounts/${id}`),

  // ── Revenue ──────────────────────────────────────────────────
  generateDailyRevenue: (date: string) =>
    apiModule3Client.post<unknown, ApiResponse<DailyRevenueReport>>(`/api/finance/revenue/generate?date=${date}`),

  getDailyRevenueRange: (from: string, to: string) =>
    apiModule3Client.get<unknown, ApiResponse<DailyRevenueReport[]>>(`/api/finance/revenue/range?from=${from}&to=${to}`),
};
