// ═══════════════════════════════════════════════════════════════════
// Admin Finance Slice — Redux Toolkit state for admin finance
// ═══════════════════════════════════════════════════════════════════

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
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
import {
  fetchPendingWithdraws,
  approveWithdraw,
  rejectWithdraw,
  fetchFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  fetchVipTiers,
  createVipTier,
  updateVipTier,
  deleteVipTier,
  fetchTransactionTypes,
  createTransactionType,
  updateTransactionType,
  deleteTransactionType,
  fetchRefunds,
  createRefund,
  approveRefund,
  rejectRefund,
  fetchFraudCases,
  reviewFraudCase,
  fetchReconciles,
  createReconcile,
  confirmReconcile,
  fetchWalletTransactions,
  fetchWebhookLogs,
  fetchSystemBankAccounts,
  createSystemBankAccount,
  toggleBankAccountStatus,
  deleteSystemBankAccount,
  fetchPaymentLocksByOrder,
  releasePaymentLock,
  fetchAdminKycs,
  approveAdminKyc,
  rejectAdminKyc,
} from "./adminFinanceThunk";

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
    }
  },
  extraReducers: (builder) => {
    // Helper to handle pending state for all fetch actions
    const pendingAction = (state: AdminFinanceState) => {
      state.status = ReduxStatus.LOADING;
      state.error = null;
    };
    // Helper to handle rejected state for all fetch actions
    const rejectedAction = (state: AdminFinanceState, action: any) => {
      state.status = ReduxStatus.FAILURE;
      state.error = action.payload as string;
    };

    builder
      // Withdraws
      .addCase(fetchPendingWithdraws.pending, pendingAction)
      .addCase(fetchPendingWithdraws.fulfilled, (state, action: PayloadAction<WithdrawResponseDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.pendingWithdraws = action.payload;
      })
      .addCase(fetchPendingWithdraws.rejected, rejectedAction)
      .addCase(approveWithdraw.fulfilled, (state, action) => {
        state.pendingWithdraws = state.pendingWithdraws.filter(w => w.id !== action.payload);
      })
      .addCase(rejectWithdraw.fulfilled, (state, action) => {
        state.pendingWithdraws = state.pendingWithdraws.filter(w => w.id !== action.payload);
      })

      // Fee Rules
      .addCase(fetchFeeRules.pending, pendingAction)
      .addCase(fetchFeeRules.fulfilled, (state, action: PayloadAction<FeeRuleDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.feeRules = action.payload;
      })
      .addCase(fetchFeeRules.rejected, rejectedAction)
      .addCase(createFeeRule.fulfilled, (state, action) => {
        state.feeRules.unshift(action.payload);
      })
      .addCase(updateFeeRule.fulfilled, (state, action) => {
        const index = state.feeRules.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
          state.feeRules[index] = { ...state.feeRules[index], ...action.payload.data };
        }
      })
      .addCase(deleteFeeRule.fulfilled, (state, action) => {
        state.feeRules = state.feeRules.filter(f => f.id !== action.payload);
      })

      // VIP Tiers
      .addCase(fetchVipTiers.pending, pendingAction)
      .addCase(fetchVipTiers.fulfilled, (state, action: PayloadAction<VipTierDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.vipTiers = action.payload;
      })
      .addCase(fetchVipTiers.rejected, rejectedAction)
      .addCase(createVipTier.fulfilled, (state, action) => {
        state.vipTiers.unshift(action.payload);
      })
      .addCase(updateVipTier.fulfilled, (state, action) => {
        const index = state.vipTiers.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vipTiers[index] = { ...state.vipTiers[index], ...action.payload.data };
        }
      })
      .addCase(deleteVipTier.fulfilled, (state, action) => {
        state.vipTiers = state.vipTiers.filter(v => v.id !== action.payload);
      })

      // Transaction Types
      .addCase(fetchTransactionTypes.pending, pendingAction)
      .addCase(fetchTransactionTypes.fulfilled, (state, action: PayloadAction<TransactionTypeDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.transactionTypes = action.payload;
      })
      .addCase(fetchTransactionTypes.rejected, rejectedAction)
      .addCase(createTransactionType.fulfilled, (state, action) => {
        state.transactionTypes.unshift(action.payload);
      })
      .addCase(updateTransactionType.fulfilled, (state, action) => {
        const index = state.transactionTypes.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transactionTypes[index] = { ...state.transactionTypes[index], ...action.payload.data };
        }
      })
      .addCase(deleteTransactionType.fulfilled, (state, action) => {
        state.transactionTypes = state.transactionTypes.filter(t => t.id !== action.payload);
      })

      // Refunds
      .addCase(fetchRefunds.pending, pendingAction)
      .addCase(fetchRefunds.fulfilled, (state, action: PayloadAction<RefundDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.refunds = action.payload;
      })
      .addCase(fetchRefunds.rejected, rejectedAction)
      .addCase(createRefund.fulfilled, (state, action) => {
        state.refunds.unshift(action.payload);
      })
      .addCase(approveRefund.fulfilled, (state, action) => {
        // Will refresh list in UI or update status locally
        const index = state.refunds.findIndex(r => r.id === action.payload);
        if (index !== -1) state.refunds[index].status = 3; // Completed
      })
      .addCase(rejectRefund.fulfilled, (state, action) => {
        const index = state.refunds.findIndex(r => r.id === action.payload);
        if (index !== -1) state.refunds[index].status = 4; // Failed
      })

      // Fraud Cases
      .addCase(fetchFraudCases.pending, pendingAction)
      .addCase(fetchFraudCases.fulfilled, (state, action: PayloadAction<FraudDetectionDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.fraudCases = action.payload;
      })
      .addCase(fetchFraudCases.rejected, rejectedAction)
      .addCase(reviewFraudCase.fulfilled, (state, action) => {
        const index = state.fraudCases.findIndex(f => f.id === action.payload.id);
        if (index !== -1) {
           state.fraudCases[index].status = action.payload.data.status;
           if(action.payload.data.resolutionNote) {
              state.fraudCases[index].resolutionNote = action.payload.data.resolutionNote;
           }
        }
      })

      // Reconciles
      .addCase(fetchReconciles.pending, pendingAction)
      .addCase(fetchReconciles.fulfilled, (state, action: PayloadAction<PlatformReconcileDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.reconciles = action.payload;
      })
      .addCase(fetchReconciles.rejected, rejectedAction)
      .addCase(createReconcile.fulfilled, (state, action) => {
        state.reconciles.unshift(action.payload);
      })
      .addCase(confirmReconcile.fulfilled, (state, action) => {
        const index = state.reconciles.findIndex(r => r.id === action.payload);
        if (index !== -1) state.reconciles[index].status = "Matched" as any;
      })

      // Wallet Transactions
      .addCase(fetchWalletTransactions.pending, pendingAction)
      .addCase(fetchWalletTransactions.fulfilled, (state, action: PayloadAction<WalletTransactionDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.walletTransactions = action.payload;
      })
      .addCase(fetchWalletTransactions.rejected, rejectedAction)

      // Webhook Logs
      .addCase(fetchWebhookLogs.pending, pendingAction)
      .addCase(fetchWebhookLogs.fulfilled, (state, action: PayloadAction<BankWebhookLogDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.webhookLogs = action.payload;
      })
      .addCase(fetchWebhookLogs.rejected, rejectedAction)

      // System Bank Accounts
      .addCase(fetchSystemBankAccounts.pending, pendingAction)
      .addCase(fetchSystemBankAccounts.fulfilled, (state, action: PayloadAction<BankAccountDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.systemBankAccounts = action.payload;
      })
      .addCase(fetchSystemBankAccounts.rejected, rejectedAction)
      .addCase(createSystemBankAccount.fulfilled, (state, action) => {
        state.systemBankAccounts.unshift(action.payload);
      })
      .addCase(toggleBankAccountStatus.fulfilled, (state, action) => {
        const index = state.systemBankAccounts.findIndex(b => b.id === action.payload);
        if (index !== -1) state.systemBankAccounts[index].isActive = !state.systemBankAccounts[index].isActive;
      })
      .addCase(deleteSystemBankAccount.fulfilled, (state, action) => {
        state.systemBankAccounts = state.systemBankAccounts.filter(b => b.id !== action.payload);
      })

      // Payment Locks
      .addCase(fetchPaymentLocksByOrder.pending, pendingAction)
      .addCase(fetchPaymentLocksByOrder.fulfilled, (state, action: PayloadAction<PaymentLockDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.paymentLocks = action.payload;
      })
      .addCase(fetchPaymentLocksByOrder.rejected, rejectedAction)
      .addCase(releasePaymentLock.fulfilled, (state, action) => {
         const index = state.paymentLocks.findIndex(p => p.id === action.payload);
         if (index !== -1) {
            state.paymentLocks[index].status = 2; // Released
         }
      })

      // Admin KYC
      .addCase(fetchAdminKycs.pending, pendingAction)
      .addCase(fetchAdminKycs.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.kycs = action.payload;
      })
      .addCase(fetchAdminKycs.rejected, rejectedAction)
      .addCase(approveAdminKyc.fulfilled, (state, action) => {
        const index = state.kycs.findIndex(k => k.id === action.payload);
        if (index !== -1) state.kycs[index].status = "Approved";
      })
      .addCase(rejectAdminKyc.fulfilled, (state, action) => {
        const index = state.kycs.findIndex(k => k.id === action.payload);
        if (index !== -1) state.kycs[index].status = "Rejected";
      })
  },
});

export const { clearAdminFinanceError, clearPaymentLocks } = adminFinanceSlice.actions;
export default adminFinanceSlice.reducer;
