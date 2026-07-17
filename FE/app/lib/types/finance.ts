// ═══════════════════════════════════════════════════════════════════
// Finance Types — Customer wallet, topup, withdraw DTOs
// ═══════════════════════════════════════════════════════════════════

import type { TopupStatusEnum, WithdrawStatusEnum, PaymentLockStatusEnum, PaymentLockTypeEnum, ReleaseReasonEnum } from "~/lib/enums/finance";

export interface WalletDto {
  id: string;
  customerId: string;
  currency: string;
  availableBalance: number;
  frozenBalance: number;
  totalBalance: number;
  isFrozen: boolean;
  frozenReason?: string;
  createdDate?: string;
}

export interface FrozenWalletDto {
  walletId: string;
  customerId: string;
  customerName: string;
  availableBalance: number;
  frozenBalance: number;
  riskScore: number;
  isFrozen: boolean;
  ignoreFraudDetection: boolean;
  reason: string;
  frozenDate: string;
}

export interface TopupResponseDto {
  id: string;
  walletId: string;
  bankAccountId: string;
  amountVnd: number;
  transferContent: string;
  status: TopupStatusEnum;
  expiresAt: string;
  createdDate?: string;
}

export interface CreateTopupDto {
  bankAccountId: string;
  amount: number;
  note?: string;
}

export interface WithdrawResponseDto {
  id: string;
  walletId: string;
  bankName: string;
  bankAccountNo: string;
  accountHolder: string;
  amountVnd: number;
  feeVnd: number;
  netAmountVnd: number;
  status: WithdrawStatusEnum;
  rejectedReason?: string;
  transferRef?: string;
  createdDate?: string;
}

export interface CreateWithdrawDto {
  bankAccountId: string;
  amount: number;
}

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

export interface ReleasePaymentLockDto {
  releaseReason: ReleaseReasonEnum;
}

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

export interface DailyRevenueReport {
  id: string;
  reportDate: string;
  serviceFeeRevenueVnd: number;
  shipFeeRevenueVnd: number;
  inspectionFeeRevenueVnd: number;
  penaltyRevenueVnd: number;
  insuranceFeeRevenueVnd: number;
  entrustmentFeeRevenueVnd: number;
  vatFeeRevenueVnd: number;
  dutyFeeRevenueVnd: number;
  totalCollectedOnBehalfVnd: number;
  totalRevenueVnd: number;
  totalOrdersCompleted: number;
  totalCnyPurchased: number;
  totalVndCollected: number;
  exchangeRateAvg?: number;
  exchangeProfitLossVnd?: number;
  generatedAt: string;
  createdDate?: string;
}
