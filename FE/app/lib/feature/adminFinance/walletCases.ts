import type { ActionReducerMapBuilder, PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "~/lib/feature/const";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import type { BankAccountDto } from "~/lib/types/bankAccount";
import type {
  RefundDto,
  FraudDetectionDto,
  PlatformReconcileDto,
  WalletTransactionDto,
  BankWebhookLogDto,
  PaymentLockDto,
} from "~/lib/types/adminFinance";
import type { AdminFinanceState } from "./adminFinanceSlice";
import {
  fetchPendingWithdraws,
  approveWithdraw,
  rejectWithdraw,
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
} from "./adminFinanceThunk";

const pendingAction = (state: AdminFinanceState) => {
  state.status = ReduxStatus.LOADING;
  state.error = null;
};

const rejectedAction = (state: AdminFinanceState, action: any) => {
  state.status = ReduxStatus.FAILURE;
  state.error = action.payload as string;
};

export function addWalletCases(builder: ActionReducerMapBuilder<AdminFinanceState>) {
  builder
    // Withdraws
    .addCase(fetchPendingWithdraws.pending, pendingAction)
    .addCase(
      fetchPendingWithdraws.fulfilled,
      (state, action: PayloadAction<WithdrawResponseDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.pendingWithdraws = action.payload;
      }
    )
    .addCase(fetchPendingWithdraws.rejected, rejectedAction)
    .addCase(approveWithdraw.pending, pendingAction)
    .addCase(approveWithdraw.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.pendingWithdraws = state.pendingWithdraws.filter(
        (w) => w.id !== action.payload
      );
    })
    .addCase(approveWithdraw.rejected, rejectedAction)
    .addCase(rejectWithdraw.pending, pendingAction)
    .addCase(rejectWithdraw.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.pendingWithdraws = state.pendingWithdraws.filter(
        (w) => w.id !== action.payload
      );
    })
    .addCase(rejectWithdraw.rejected, rejectedAction)

    // Refunds
    .addCase(fetchRefunds.pending, pendingAction)
    .addCase(
      fetchRefunds.fulfilled,
      (state, action: PayloadAction<RefundDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.refunds = action.payload;
      }
    )
    .addCase(fetchRefunds.rejected, rejectedAction)
    .addCase(createRefund.pending, pendingAction)
    .addCase(createRefund.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.refunds.unshift(action.payload);
    })
    .addCase(createRefund.rejected, rejectedAction)
    .addCase(approveRefund.pending, pendingAction)
    .addCase(approveRefund.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.refunds.findIndex((r) => r.id === action.payload);
      if (index !== -1) state.refunds[index].status = 3; // Completed
    })
    .addCase(approveRefund.rejected, rejectedAction)
    .addCase(rejectRefund.pending, pendingAction)
    .addCase(rejectRefund.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.refunds.findIndex((r) => r.id === action.payload);
      if (index !== -1) state.refunds[index].status = 4; // Failed
    })
    .addCase(rejectRefund.rejected, rejectedAction)

    // Fraud Cases
    .addCase(fetchFraudCases.pending, pendingAction)
    .addCase(
      fetchFraudCases.fulfilled,
      (state, action: PayloadAction<FraudDetectionDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.fraudCases = action.payload;
      }
    )
    .addCase(fetchFraudCases.rejected, rejectedAction)
    .addCase(reviewFraudCase.pending, pendingAction)
    .addCase(reviewFraudCase.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.fraudCases.findIndex(
        (f) => f.id === action.payload.id
      );
      if (index !== -1) {
        state.fraudCases[index].status = action.payload.data.status;
        if (action.payload.data.resolutionNote) {
          state.fraudCases[index].resolutionNote =
            action.payload.data.resolutionNote;
        }
      }
    })
    .addCase(reviewFraudCase.rejected, rejectedAction)

    // Reconciles
    .addCase(fetchReconciles.pending, pendingAction)
    .addCase(
      fetchReconciles.fulfilled,
      (state, action: PayloadAction<PlatformReconcileDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.reconciles = action.payload;
      }
    )
    .addCase(fetchReconciles.rejected, rejectedAction)
    .addCase(createReconcile.fulfilled, (state, action) => {
      state.reconciles.unshift(action.payload);
    })
    .addCase(confirmReconcile.fulfilled, (state, action) => {
      const index = state.reconciles.findIndex((r) => r.id === action.payload);
      if (index !== -1) state.reconciles[index].status = "Matched" as any;
    })

    // Wallet Transactions
    .addCase(fetchWalletTransactions.pending, pendingAction)
    .addCase(
      fetchWalletTransactions.fulfilled,
      (state, action: PayloadAction<WalletTransactionDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.walletTransactions = action.payload;
      }
    )
    .addCase(fetchWalletTransactions.rejected, rejectedAction)

    // Webhook Logs
    .addCase(fetchWebhookLogs.pending, pendingAction)
    .addCase(
      fetchWebhookLogs.fulfilled,
      (state, action: PayloadAction<BankWebhookLogDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.webhookLogs = action.payload;
      }
    )
    .addCase(fetchWebhookLogs.rejected, rejectedAction)

    // System Bank Accounts
    .addCase(fetchSystemBankAccounts.pending, pendingAction)
    .addCase(
      fetchSystemBankAccounts.fulfilled,
      (state, action: PayloadAction<BankAccountDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.systemBankAccounts = action.payload;
      }
    )
    .addCase(fetchSystemBankAccounts.rejected, rejectedAction)
    .addCase(createSystemBankAccount.fulfilled, (state, action) => {
      state.systemBankAccounts.unshift(action.payload);
    })
    .addCase(toggleBankAccountStatus.fulfilled, (state, action) => {
      const index = state.systemBankAccounts.findIndex(
        (b) => b.id === action.payload
      );
      if (index !== -1)
        state.systemBankAccounts[index].isActive =
          !state.systemBankAccounts[index].isActive;
    })
    .addCase(deleteSystemBankAccount.fulfilled, (state, action) => {
      state.systemBankAccounts = state.systemBankAccounts.filter(
        (b) => b.id !== action.payload
      );
    })

    // Payment Locks
    .addCase(fetchPaymentLocksByOrder.pending, pendingAction)
    .addCase(
      fetchPaymentLocksByOrder.fulfilled,
      (state, action: PayloadAction<PaymentLockDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.paymentLocks = action.payload;
      }
    )
    .addCase(fetchPaymentLocksByOrder.rejected, rejectedAction)
    .addCase(releasePaymentLock.fulfilled, (state, action) => {
      const index = state.paymentLocks.findIndex(
        (p) => p.id === action.payload
      );
      if (index !== -1) {
        state.paymentLocks[index].status = 2; // Released
      }
    });
}
