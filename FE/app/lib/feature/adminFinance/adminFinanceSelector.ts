import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export const selectAdminFinance = (state: RootState) => state.adminFinanceState;

export const selectPendingWithdraws = createSelector([selectAdminFinance], (state) => state.pendingWithdraws);
export const selectFeeRules = createSelector([selectAdminFinance], (state) => state.feeRules);
export const selectVipTiers = createSelector([selectAdminFinance], (state) => state.vipTiers);
export const selectTransactionTypes = createSelector([selectAdminFinance], (state) => state.transactionTypes);
export const selectRefunds = createSelector([selectAdminFinance], (state) => state.refunds);
export const selectFraudCases = createSelector([selectAdminFinance], (state) => state.fraudCases);
export const selectReconciles = createSelector([selectAdminFinance], (state) => state.reconciles);
export const selectWalletTransactions = createSelector([selectAdminFinance], (state) => state.walletTransactions);
export const selectWebhookLogs = createSelector([selectAdminFinance], (state) => state.webhookLogs);
export const selectSystemBankAccounts = createSelector([selectAdminFinance], (state) => state.systemBankAccounts);
export const selectPaymentLocks = createSelector([selectAdminFinance], (state) => state.paymentLocks);

export const selectAdminFinanceStatus = createSelector([selectAdminFinance], (state) => state.status);
export const selectAdminFinanceError = createSelector([selectAdminFinance], (state) => state.error);
