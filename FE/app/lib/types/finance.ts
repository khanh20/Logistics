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
  type: PaymentLockTypeEnum;
  amount: number;
  status: PaymentLockStatusEnum;
  expiresAt: string;
  releasedAt?: string;
  releaseReason?: ReleaseReasonEnum;
}

export interface ReleasePaymentLockDto {
  releaseReason: ReleaseReasonEnum;
}
