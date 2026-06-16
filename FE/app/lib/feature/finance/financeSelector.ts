import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { TopupStatusEnum } from '~/lib/enums/finance';

// Selector cơ bản
export const selectFinance = (state: RootState) => state.financeState;

export const selectWallet = createSelector(
  [selectFinance],
  (finance) => finance.wallet
);

export const selectTopups = createSelector(
  [selectFinance],
  (finance) => finance.topups
);

export const selectWithdraws = createSelector(
  [selectFinance],
  (finance) => finance.withdraws
);

export const selectBankAccounts = createSelector(
  [selectFinance],
  (finance) => finance.bankAccounts
);

export const selectSystemBankAccounts = createSelector(
  [selectFinance],
  (finance) => finance.systemBankAccounts
);

export const selectFinanceStatus = createSelector(
  [selectFinance],
  (finance) => finance.status
);

export const selectFinanceError = createSelector(
  [selectFinance],
  (finance) => finance.error
);

// Ví dụ về một "Derived Selector" (Selector phái sinh)
// Lấy danh sách các lệnh nạp tiền đang chờ xử lý (Pending)
export const selectPendingTopups = createSelector(
  [selectTopups],
  (topups) => topups.filter(t => t.status === TopupStatusEnum.Pending)
);

// Lấy số dư khả dụng một cách an toàn
export const selectAvailableBalance = createSelector(
  [selectWallet],
  (wallet) => wallet?.availableBalance ?? 0
);
