// ═══════════════════════════════════════════════════════════════════
// Admin Finance Types — Tất cả DTOs cho admin finance screens
// ═══════════════════════════════════════════════════════════════════

import type {
  FraudTypeEnum,
  FraudStatusEnum,
  FraudActionEnum,
  RefundStatusEnum,
  RefundReasonEnum,
  ReconcileStatusEnum,
  PaymentLockStatusEnum,
  PaymentLockTypeEnum,
  ReleaseReasonEnum,
  TransactionDirectionEnum,
  WebhookProcessingStatusEnum,
  EmailTemplateTypeEnum,
  NotificationDeliveryStatusEnum,
} from "~/lib/enums/finance";

// ── Fee Rule ─────────────────────────────────────────────────────
export interface FeeRuleDto {
  id: string;
  name: string;
  vipTierId?: string;
  platformId?: string;
  serviceFeePct: number;
  intlShipPerKgVnd: number;
  intlShipVolDivisor: number;
  minChargeKg: number;
  inspectionFeePct: number;
  inspectionMinVnd: number;
  inspectionMaxVnd: number;
  insuranceBasicPct: number;
  insuranceFullPct: number;
  storageDailyPerKgVnd: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface CreateFeeRuleDto {
  name: string;
  vipTierId?: string;
  platformId?: string;
  serviceFeePct: number;
  intlShipPerKgVnd: number;
  intlShipVolDivisor?: number;
  minChargeKg?: number;
  inspectionFeePct?: number;
  inspectionMinVnd?: number;
  inspectionMaxVnd?: number;
  insuranceBasicPct?: number;
  insuranceFullPct?: number;
  storageDailyPerKgVnd?: number;
  isActive?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

// ── VIP Tier ─────────────────────────────────────────────────────
export interface VipTierDto {
  id: string;
  name: string;
  level: number;
  minSpendVnd: number;
  serviceFeeDiscountPct: number;
  freeInspection: boolean;
  freeStorageDays: number;
  prioritySupport: boolean;
  depositPctOverride?: number;
  cashbackPct: number;
  colorHex?: string;
}

export interface CreateVipTierDto {
  name: string;
  level: number;
  minSpendVnd: number;
  serviceFeeDiscountPct?: number;
  freeInspection?: boolean;
  freeStorageDays?: number;
  prioritySupport?: boolean;
  depositPctOverride?: number;
  cashbackPct?: number;
  colorHex?: string;
}

// ── Transaction Type ─────────────────────────────────────────────
export interface TransactionTypeDto {
  id: string;
  code: string;
  name: string;
  direction?: TransactionDirectionEnum;
  isReversible: boolean;
}

export interface CreateTransactionTypeDto {
  code: string;
  name: string;
  direction?: TransactionDirectionEnum;
  isReversible?: boolean;
}

export interface UpdateTransactionTypeDto {
  id: string;
  code: string;
  name: string;
  direction?: TransactionDirectionEnum;
  isReversible: boolean;
}

// ── Refund ────────────────────────────────────────────────────────
export interface RefundDto {
  id: string;
  walletId: string;
  triggeredBy?: string;
  reason?: RefundReasonEnum;
  referenceType: string;
  referenceId: string;
  grossAmountVnd: number;
  penaltyPct: number;
  penaltyVnd: number;
  netRefundVnd: number;
  status: RefundStatusEnum;
  refundedAt?: string;
  createdDate?: string;
}

export interface CreateRefundDto {
  walletId: string;
  reason?: RefundReasonEnum;
  referenceType: string;
  referenceId: string;
  grossAmountVnd: number;
  penaltyPct?: number;
}

// ── Fraud Detection ──────────────────────────────────────────────
export interface FraudDetectionDto {
  id: string;
  walletId: string;
  customerId: string;
  fraudType?: FraudTypeEnum;
  riskScore: number;
  evidenceJson?: string;
  action: FraudActionEnum;
  status: FraudStatusEnum;
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNote?: string;
  createdDate?: string;
}

export interface ReviewFraudDto {
  status: FraudStatusEnum;
  resolutionNote?: string;
}

// ── Platform Reconcile ───────────────────────────────────────────
export interface PlatformReconcileDto {
  id: string;
  reconcileDate: string;
  platformId: string;
  platformAccountId: string;
  cnySpent: number;
  vndEquivalent: number;
  serviceFeeCollectedVnd: number;
  varianceVnd?: number;
  alipayStatementUrl?: string;
  status: ReconcileStatusEnum;
  notes?: string;
  reconciledBy?: string;
  reconciledAt?: string;
  createdDate?: string;
}

export interface CreatePlatformReconcileDto {
  reconcileDate: string;
  platformId: string;
  platformAccountId: string;
  cnySpent: number;
  vndEquivalent: number;
  serviceFeeCollectedVnd: number;
  alipayStatementUrl?: string;
  notes?: string;
}

// ── Payment Lock ─────────────────────────────────────────────────
export interface PaymentLockDto {
  id: string;
  walletId: string;
  orderId: string;
  lockType: PaymentLockTypeEnum;
  lockedAmountVnd: number;
  status: PaymentLockStatusEnum;
  expiresAt: string;
  releasedAt?: string;
  releaseReason?: ReleaseReasonEnum;
  createdDate?: string;
}

export interface CreatePaymentLockDto {
  walletId: string;
  orderId: string;
  lockType: PaymentLockTypeEnum;
  lockedAmountVnd: number;
  expiresAt: string;
}

// ── Wallet Transaction ──────────────────────────────────────────
export interface WalletTransactionDto {
  id: string;
  walletId: string;
  typeId: string;
  typeName?: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string;
  note?: string;
  createdDate?: string;
}

// ── Bank Webhook Log ─────────────────────────────────────────────
export interface BankWebhookLogDto {
  id: string;
  bankAccountId: number;
  idempotencyKey: string;
  rawPayload: string;
  bankRef?: string;
  amountVnd?: number;
  transferContent?: string;
  transactionDate?: string;
  matchedTopupId?: string;
  processingStatus?: WebhookProcessingStatusEnum;
  processedAt?: string;
  createdDate?: string;
}

// ── Email Notification ───────────────────────────────────────────
export interface EmailNotificationDto {
  id: string;
  customerId: string;
  toEmail: string;
  subject: string;
  templateType?: EmailTemplateTypeEnum;
  templateData?: string;
  body?: string;
  deliveryStatus: NotificationDeliveryStatusEnum;
  messageId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdDate?: string;
}

export interface SendEmailNotificationDto {
  customerId: string;
  toEmail: string;
  subject: string;
  body?: string;
  templateType?: EmailTemplateTypeEnum;
  templateData?: string;
}

// ── Finance Management ───────────────────────────────────────────
export interface CreditLimitDto {
  id: string;
  customerId: string;
  maxCreditVnd: number;
  currentDebtVnd: number;
  availableCreditVnd: number;
  dueDateDays: number;
  isActive: boolean;
}

export interface UpdateCreditLimitDto {
  customerId: string;
  maxCreditVnd: number;
  dueDateDays?: number;
  isActive?: boolean;
}

export interface DebtRecordDto {
  id: string;
  walletId: string;
  orderId: string;
  amountVnd: number;
  paidVnd: number;
  remainingVnd: number;
  dueDate: string;
  isOverdue: boolean;
  createdDate?: string;
}

// ── Admin Withdraw ───────────────────────────────────────────────
export interface ApproveWithdrawRequest {
  transferRef?: string;
}

export interface RejectWithdrawRequest {
  reason: string;
}
