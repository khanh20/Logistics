import type { ActionReducerMapBuilder, PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "~/lib/feature/const";
import type {
  FeeRuleDto,
  VipTierDto,
  TransactionTypeDto,
} from "~/lib/types/adminFinance";
import type { AdminFinanceState } from "./adminFinanceSlice";
import {
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
} from "./adminFinanceThunk";

const pendingAction = (state: AdminFinanceState) => {
  state.status = ReduxStatus.LOADING;
  state.error = null;
};

const rejectedAction = (state: AdminFinanceState, action: any) => {
  state.status = ReduxStatus.FAILURE;
  state.error = action.payload as string;
};

export function addFeeRulesCases(
  builder: ActionReducerMapBuilder<AdminFinanceState>
) {
  builder
    // Fee Rules
    .addCase(fetchFeeRules.pending, pendingAction)
    .addCase(
      fetchFeeRules.fulfilled,
      (state, action: PayloadAction<FeeRuleDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.feeRules = action.payload;
      }
    )
    .addCase(fetchFeeRules.rejected, rejectedAction)
    .addCase(createFeeRule.pending, pendingAction)
    .addCase(createFeeRule.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.feeRules.unshift(action.payload);
    })
    .addCase(createFeeRule.rejected, rejectedAction)
    .addCase(updateFeeRule.pending, pendingAction)
    .addCase(updateFeeRule.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.feeRules.findIndex((f) => f.id === action.payload.id);
      if (index !== -1) {
        state.feeRules[index] = {
          ...state.feeRules[index],
          ...action.payload.data,
        };
      }
    })
    .addCase(updateFeeRule.rejected, rejectedAction)
    .addCase(deleteFeeRule.pending, pendingAction)
    .addCase(deleteFeeRule.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.feeRules = state.feeRules.filter((f) => f.id !== action.payload);
    })
    .addCase(deleteFeeRule.rejected, rejectedAction)

    // VIP Tiers
    .addCase(fetchVipTiers.pending, pendingAction)
    .addCase(
      fetchVipTiers.fulfilled,
      (state, action: PayloadAction<VipTierDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.vipTiers = action.payload;
      }
    )
    .addCase(fetchVipTiers.rejected, rejectedAction)
    .addCase(createVipTier.pending, pendingAction)
    .addCase(createVipTier.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.vipTiers.unshift(action.payload);
    })
    .addCase(createVipTier.rejected, rejectedAction)
    .addCase(updateVipTier.pending, pendingAction)
    .addCase(updateVipTier.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.vipTiers.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.vipTiers[index] = {
          ...state.vipTiers[index],
          ...action.payload.data,
        };
      }
    })
    .addCase(updateVipTier.rejected, rejectedAction)
    .addCase(deleteVipTier.pending, pendingAction)
    .addCase(deleteVipTier.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.vipTiers = state.vipTiers.filter((v) => v.id !== action.payload);
    })
    .addCase(deleteVipTier.rejected, rejectedAction)

    // Transaction Types
    .addCase(fetchTransactionTypes.pending, pendingAction)
    .addCase(
      fetchTransactionTypes.fulfilled,
      (state, action: PayloadAction<TransactionTypeDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.transactionTypes = action.payload;
      }
    )
    .addCase(fetchTransactionTypes.rejected, rejectedAction)
    .addCase(createTransactionType.pending, pendingAction)
    .addCase(createTransactionType.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.transactionTypes.unshift(action.payload);
    })
    .addCase(createTransactionType.rejected, rejectedAction)
    .addCase(updateTransactionType.pending, pendingAction)
    .addCase(updateTransactionType.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      const index = state.transactionTypes.findIndex(
        (t) => t.id === action.payload.id
      );
      if (index !== -1) {
        state.transactionTypes[index] = {
          ...state.transactionTypes[index],
          ...action.payload.data,
        };
      }
    })
    .addCase(updateTransactionType.rejected, rejectedAction)
    .addCase(deleteTransactionType.pending, pendingAction)
    .addCase(deleteTransactionType.fulfilled, (state, action) => {
      state.status = ReduxStatus.SUCCESS;
      state.transactionTypes = state.transactionTypes.filter(
        (t) => t.id !== action.payload
      );
    })
    .addCase(deleteTransactionType.rejected, rejectedAction);
}
