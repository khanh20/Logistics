import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "../const";
import type { 
  WalletDto, 
  TopupResponseDto, 
  WithdrawResponseDto 
} from "../../types/finance";
import { 
  fetchMyWallet, 
  fetchMyTopups, 
  submitTopup, 
  fetchMyWithdraws, 
  submitWithdraw,
  fetchMyBankAccounts,
  fetchSystemBankAccounts,
  createMyBankAccount,
  toggleMyBankAccountStatus,
  deleteMyBankAccount
} from "./financeThunk";
import type { BankAccountDto } from "../../types/bankAccount";

export interface FinanceState {
  wallet: WalletDto | null;
  topups: TopupResponseDto[];
  withdraws: WithdrawResponseDto[];
  bankAccounts: BankAccountDto[];
  systemBankAccounts: BankAccountDto[];
  status: ReduxStatus;
  error: string | null;
}

const initialState: FinanceState = {
  wallet: null,
  topups: [],
  withdraws: [],
  bankAccounts: [],
  systemBankAccounts: [],
  status: ReduxStatus.IDLE,
  error: null,
};

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    clearFinanceError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Wallet
      .addCase(fetchMyWallet.pending, (state) => {
        state.status = ReduxStatus.LOADING;
      })
      .addCase(fetchMyWallet.fulfilled, (state, action: PayloadAction<WalletDto>) => {
        state.status = ReduxStatus.SUCCESS;
        state.wallet = action.payload;
      })
      .addCase(fetchMyWallet.rejected, (state, action) => {
        state.status = ReduxStatus.FAILURE;
        state.error = action.payload as string;
      })
      // Submit Topup
      .addCase(submitTopup.pending, (state) => {
        state.status = ReduxStatus.LOADING;
      })
      .addCase(submitTopup.fulfilled, (state, action: PayloadAction<TopupResponseDto>) => {
        state.status = ReduxStatus.SUCCESS;
        state.topups.unshift(action.payload);
      })
      .addCase(submitTopup.rejected, (state, action) => {
        state.status = ReduxStatus.FAILURE;
        state.error = action.payload as string;
      })
      // Fetch Topups
      .addCase(fetchMyTopups.fulfilled, (state, action: PayloadAction<TopupResponseDto[]>) => {
        state.topups = action.payload;
      })
      // Submit Withdraw
      .addCase(submitWithdraw.pending, (state) => {
        state.status = ReduxStatus.LOADING;
      })
      .addCase(submitWithdraw.fulfilled, (state, action: PayloadAction<WithdrawResponseDto>) => {
        state.status = ReduxStatus.SUCCESS;
        state.withdraws.unshift(action.payload);
        if (state.wallet) {
          state.wallet.availableBalance -= action.payload.amountVnd;
          state.wallet.frozenBalance += action.payload.amountVnd;
        }
      })
      .addCase(submitWithdraw.rejected, (state, action) => {
        state.status = ReduxStatus.FAILURE;
        state.error = action.payload as string;
      })
      // Fetch Withdraws
      .addCase(fetchMyWithdraws.fulfilled, (state, action: PayloadAction<WithdrawResponseDto[]>) => {
        state.withdraws = action.payload;
      })
      // Bank Accounts
      .addCase(fetchMyBankAccounts.fulfilled, (state, action: PayloadAction<BankAccountDto[]>) => {
        state.bankAccounts = action.payload;
      })
      .addCase(fetchSystemBankAccounts.fulfilled, (state, action: PayloadAction<BankAccountDto[]>) => {
        state.systemBankAccounts = action.payload;
      })
      .addCase(createMyBankAccount.fulfilled, (state, action: PayloadAction<BankAccountDto>) => {
        state.bankAccounts.unshift(action.payload);
      })
      .addCase(toggleMyBankAccountStatus.fulfilled, (state, action) => {
        const index = state.bankAccounts.findIndex(b => b.id === action.payload);
        if (index !== -1) {
          state.bankAccounts[index].isActive = !state.bankAccounts[index].isActive;
        }
      })
      .addCase(deleteMyBankAccount.fulfilled, (state, action) => {
        state.bankAccounts = state.bankAccounts.filter(b => b.id !== action.payload);
      });
  },
});

export const { clearFinanceError } = financeSlice.actions;
export default financeSlice.reducer;
