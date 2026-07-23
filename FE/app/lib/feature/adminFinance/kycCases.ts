import type { ActionReducerMapBuilder, PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "~/lib/feature/const";
import type { AdminFinanceState } from "./adminFinanceSlice";
import {
  fetchAdminKycs,
  approveAdminKyc,
  rejectAdminKyc,
} from "./adminFinanceThunk";

const pendingAction = (state: AdminFinanceState) => {
  state.status = ReduxStatus.LOADING;
  state.error = null;
};

const rejectedAction = (state: AdminFinanceState, action: any) => {
  state.status = ReduxStatus.FAILURE;
  state.error = action.payload as string;
};

export function addKycCases(builder: ActionReducerMapBuilder<AdminFinanceState>) {
  builder
    // Admin KYC
    .addCase(fetchAdminKycs.pending, pendingAction)
    .addCase(fetchAdminKycs.fulfilled, (state, action: PayloadAction<any[]>) => {
      state.status = ReduxStatus.SUCCESS;
      state.kycs = action.payload;
    })
    .addCase(fetchAdminKycs.rejected, rejectedAction)
    .addCase(approveAdminKyc.fulfilled, (state, action) => {
      const index = state.kycs.findIndex((k) => k.id === action.payload);
      if (index !== -1) state.kycs[index].status = "Approved";
    })
    .addCase(rejectAdminKyc.fulfilled, (state, action) => {
      const index = state.kycs.findIndex((k) => k.id === action.payload);
      if (index !== -1) state.kycs[index].status = "Rejected";
    });
}
