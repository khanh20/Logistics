// ═══════════════════════════════════════════════════════════════════
// Admin Finance API — All admin-only finance endpoints
// ═══════════════════════════════════════════════════════════════════

import { apiModule3Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import type { BankAccountDto } from "~/lib/types/bankAccount";
import type {
  FeeRuleDto,
  CreateFeeRuleDto,
  VipTierDto,
  CreateVipTierDto,
  TransactionTypeDto,
  CreateTransactionTypeDto,
  UpdateTransactionTypeDto,
  RefundDto,
  CreateRefundDto,
  FraudDetectionDto,
  ReviewFraudDto,
  PlatformReconcileDto,
  CreatePlatformReconcileDto,
  PaymentLockDto,
  CreatePaymentLockDto,
  WalletTransactionDto,
  BankWebhookLogDto,
  EmailNotificationDto,
  SendEmailNotificationDto,
  CreditLimitDto,
  UpdateCreditLimitDto,
  DebtRecordDto,
  ApproveWithdrawRequest,
  RejectWithdrawRequest,
} from "~/lib/types/adminFinance";
import type { ReleaseReasonEnum } from "~/lib/enums/finance";

export const adminFinanceApi = {
  // ── Admin Transaction (Withdraw Approval) ────────────────────
  getPendingWithdraws: () =>
    apiModule3Client.get<unknown, ApiResponse<WithdrawResponseDto[]>>("/api/admin/transactions/withdraws/pending"),

  approveWithdraw: (id: string, data: ApproveWithdrawRequest) =>
    apiModule3Client.post<unknown, ApiResponse<{ message: string }>>(`/api/admin/transactions/withdraws/${id}/approve`, data),

  rejectWithdraw: (id: string, data: RejectWithdrawRequest) =>
    apiModule3Client.post<unknown, ApiResponse<{ message: string }>>(`/api/admin/transactions/withdraws/${id}/reject`, data),

  // ── Fee Rule ─────────────────────────────────────────────────
  getAllFeeRules: () =>
    apiModule3Client.get<unknown, ApiResponse<FeeRuleDto[]>>("/api/FeeRule"),

  getFeeRuleById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<FeeRuleDto>>(`/api/FeeRule/${id}`),

  createFeeRule: (data: CreateFeeRuleDto) =>
    apiModule3Client.post<unknown, ApiResponse<FeeRuleDto>>("/api/FeeRule", data),

  updateFeeRule: (id: string, data: CreateFeeRuleDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/FeeRule/${id}`, data),

  deleteFeeRule: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<void>>(`/api/FeeRule/${id}`),

  // ── VIP Tier ─────────────────────────────────────────────────
  getAllVipTiers: () =>
    apiModule3Client.get<unknown, ApiResponse<VipTierDto[]>>("/api/VipTier"),

  getVipTierById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<VipTierDto>>(`/api/VipTier/${id}`),

  createVipTier: (data: CreateVipTierDto) =>
    apiModule3Client.post<unknown, ApiResponse<VipTierDto>>("/api/VipTier", data),

  updateVipTier: (id: string, data: CreateVipTierDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/VipTier/${id}`, data),

  deleteVipTier: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<void>>(`/api/VipTier/${id}`),

  // ── Transaction Type ─────────────────────────────────────────
  getAllTransactionTypes: () =>
    apiModule3Client.get<unknown, ApiResponse<TransactionTypeDto[]>>("/api/transaction-types"),

  getTransactionTypeById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<TransactionTypeDto>>(`/api/transaction-types/${id}`),

  createTransactionType: (data: CreateTransactionTypeDto) =>
    apiModule3Client.post<unknown, ApiResponse<TransactionTypeDto>>("/api/transaction-types", data),

  updateTransactionType: (id: string, data: UpdateTransactionTypeDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/transaction-types/${id}`, data),

  deleteTransactionType: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<void>>(`/api/transaction-types/${id}`),

  // ── Refund ───────────────────────────────────────────────────
  getAllRefunds: () =>
    apiModule3Client.get<unknown, ApiResponse<RefundDto[]>>("/api/Refund"),

  getRefundById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<RefundDto>>(`/api/Refund/${id}`),

  createRefund: (data: CreateRefundDto) =>
    apiModule3Client.post<unknown, ApiResponse<RefundDto>>("/api/Refund/request", data),

  approveRefund: (id: string) =>
    apiModule3Client.post<unknown, ApiResponse<string>>(`/api/Refund/${id}/approve`),

  rejectRefund: (id: string, reason: string) =>
    apiModule3Client.post<unknown, ApiResponse<string>>(`/api/Refund/${id}/reject`, JSON.stringify(reason), {
      headers: { "Content-Type": "application/json" },
    }),

  // ── Fraud Detection ──────────────────────────────────────────
  getAllFraudCases: () =>
    apiModule3Client.get<unknown, ApiResponse<FraudDetectionDto[]>>("/api/FraudDetection"),

  getFraudCaseById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<FraudDetectionDto>>(`/api/FraudDetection/${id}`),

  reviewFraudCase: (id: string, data: ReviewFraudDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/FraudDetection/${id}/review`, data),

  // ── Platform Reconcile ───────────────────────────────────────
  getAllReconciles: () =>
    apiModule3Client.get<unknown, ApiResponse<PlatformReconcileDto[]>>("/api/PlatformReconcile"),

  createReconcile: (data: CreatePlatformReconcileDto) =>
    apiModule3Client.post<unknown, ApiResponse<PlatformReconcileDto>>("/api/PlatformReconcile", data),

  confirmReconcile: (id: string) =>
    apiModule3Client.post<unknown, ApiResponse<void>>(`/api/PlatformReconcile/${id}/confirm`),

  // ── Wallet Transaction ───────────────────────────────────────
  getAllWalletTransactions: () =>
    apiModule3Client.get<unknown, ApiResponse<WalletTransactionDto[]>>("/api/WalletTransaction"),

  getWalletTransactionsByWallet: (walletId: string) =>
    apiModule3Client.get<unknown, ApiResponse<WalletTransactionDto[]>>(`/api/WalletTransaction/wallet/${walletId}`),

  // ── Bank Webhook Log ─────────────────────────────────────────
  getAllWebhookLogs: () =>
    apiModule3Client.get<unknown, ApiResponse<BankWebhookLogDto[]>>("/api/BankWebhookLog"),

  getWebhookLogById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<BankWebhookLogDto>>(`/api/BankWebhookLog/${id}`),

  // ── Payment Lock ─────────────────────────────────────────────
  getPaymentLocksByOrder: (orderId: string) =>
    apiModule3Client.get<unknown, ApiResponse<PaymentLockDto[]>>(`/api/PaymentLock/order/${orderId}`),

  createPaymentLock: (data: CreatePaymentLockDto) =>
    apiModule3Client.post<unknown, ApiResponse<PaymentLockDto>>("/api/PaymentLock", data),

  releasePaymentLock: (id: string, reason: ReleaseReasonEnum) =>
    apiModule3Client.post<unknown, ApiResponse<void>>(`/api/PaymentLock/${id}/release?reason=${reason}`),

  // ── Admin KYC Verification ───────────────────────────────────
  getAllKycs: () =>
    apiModule3Client.get<unknown, ApiResponse<any[]>>("/api/admin/kyc"),

  approveKyc: (id: string) =>
    apiModule3Client.post<unknown, ApiResponse<any>>(`/api/admin/kyc/${id}/approve`),

  rejectKyc: (id: string, reason: string) =>
    apiModule3Client.post<unknown, ApiResponse<any>>(`/api/admin/kyc/${id}/reject`, { reason }),

  // ── Finance Management ───────────────────────────────────────
  getCreditLimit: (walletId: string) =>
    apiModule3Client.get<unknown, ApiResponse<CreditLimitDto>>(`/api/FinanceManagement/credit-limit/${walletId}`),

  updateCreditLimit: (data: UpdateCreditLimitDto) =>
    apiModule3Client.post<unknown, ApiResponse<CreditLimitDto>>("/api/FinanceManagement/credit-limit", data),

  getDebts: (walletId: string) =>
    apiModule3Client.get<unknown, ApiResponse<DebtRecordDto[]>>(`/api/FinanceManagement/debts/${walletId}`),

  payDebt: (debtId: string, amount: number) =>
    apiModule3Client.post<unknown, ApiResponse<string>>(`/api/FinanceManagement/pay-debt/${debtId}`, amount),

  // ── Email Notification ───────────────────────────────────────
  getEmailsByCustomer: (customerId: string) =>
    apiModule3Client.get<unknown, ApiResponse<EmailNotificationDto[]>>(`/api/EmailNotification/customer/${customerId}`),

  sendEmailNotification: (data: SendEmailNotificationDto) =>
    apiModule3Client.post<unknown, ApiResponse<EmailNotificationDto>>("/api/EmailNotification/send", data),

  // ── Bank Account (Admin view) ────────────────────────────────
  getAllSystemBankAccounts: () =>
    apiModule3Client.get<unknown, ApiResponse<BankAccountDto[]>>("/api/bank-accounts/system"),
};
