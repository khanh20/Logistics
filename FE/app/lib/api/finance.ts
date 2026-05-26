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
} from "~/lib/types/finance";

export const financeApi = {
  // ── Wallet ───────────────────────────────────────────────────
  getMyWallet: () =>
    apiModule3Client.get<unknown, ApiResponse<WalletDto>>("/api/transactions/my-wallet"),

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

  releasePaymentLock: (id: string, reason: string) =>
    apiModule3Client.post<unknown, ApiResponse<PaymentLockDto>>(`/api/PaymentLock/${id}/release?reason=${reason}`),

  // ── Bank Account ─────────────────────────────────────────────
  getMyBankAccounts: () =>
    apiModule3Client.get<unknown, ApiResponse<any[]>>("/api/bank-accounts/my"),

  createBankAccount: (data: any) =>
    apiModule3Client.post<unknown, ApiResponse<any>>("/api/bank-accounts", data),

  deleteBankAccount: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<any>>(`/api/bank-accounts/${id}`),
};
