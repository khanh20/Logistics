// ═══════════════════════════════════════════════════════════════════
// Admin Finance Slice — Redux Toolkit state for admin finance
// ═══════════════════════════════════════════════════════════════════

import { createSlice } from "@reduxjs/toolkit";
import { ReduxStatus } from "~/lib/feature/const";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import type { BankAccountDto } from "~/lib/types/bankAccount";
import type {
  FeeRuleDto,
  VipTierDto,
  TransactionTypeDto,
  RefundDto,
  FraudDetectionDto,
  PlatformReconcileDto,
  WalletTransactionDto,
  BankWebhookLogDto,
  PaymentLockDto,
} from "~/lib/types/adminFinance";
import { addWalletCases } from "./walletCases";
import { addKycCases } from "./kycCases";
import { addFeeRulesCases } from "./feeRulesCases";

export interface AdminFinanceState {
  pendingWithdraws: WithdrawResponseDto[];
  feeRules: FeeRuleDto[];
  vipTiers: VipTierDto[];
  transactionTypes: TransactionTypeDto[];
  refunds: RefundDto[];
  fraudCases: FraudDetectionDto[];
  reconciles: PlatformReconcileDto[];
  walletTransactions: WalletTransactionDto[];
  webhookLogs: BankWebhookLogDto[];
  systemBankAccounts: BankAccountDto[];
  paymentLocks: PaymentLockDto[];
  kycs: any[];
  status: ReduxStatus;
  error: string | null;
}

const initialState: AdminFinanceState = {
  pendingWithdraws: [],
  feeRules: [],
  vipTiers: [],
  transactionTypes: [],
  refunds: [],
  fraudCases: [],
  reconciles: [],
  walletTransactions: [],
  webhookLogs: [],
  systemBankAccounts: [],
  paymentLocks: [],
  kycs: [],
  status: ReduxStatus.IDLE,
  error: null,
};

const adminFinanceSlice = createSlice({
  name: "adminFinance",
  initialState,
  reducers: {
    clearAdminFinanceError(state) {
      state.error = null;
    },
    clearPaymentLocks(state) {
      state.paymentLocks = [];
    },
  },
  extraReducers: (builder) => {
    addWalletCases(builder);
    addKycCases(builder);
    addFeeRulesCases(builder);
  },
});

export const { clearAdminFinanceError, clearPaymentLocks } =
  adminFinanceSlice.actions;
export default adminFinanceSlice.reducer;
