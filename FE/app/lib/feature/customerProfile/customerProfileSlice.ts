// ═══════════════════════════════════════════════════════════════════
// Customer Profile Slice
// ═══════════════════════════════════════════════════════════════════

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "~/lib/feature/const";
import type { CustomerProfileDto, CustomerAddressDto, CustomerKycDto } from "~/lib/types/customerProfile";
import {
  fetchMyProfile,
  createMyProfile,
  updateProfile,
  fetchMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  fetchKyc,
  submitKyc,
} from "./customerProfileThunk";

export interface CustomerProfileState {
  profile: CustomerProfileDto | null;
  addresses: CustomerAddressDto[];
  kyc: CustomerKycDto | null;
  status: ReduxStatus;
  error: string | null;
}

const initialState: CustomerProfileState = {
  profile: null,
  addresses: [],
  kyc: null,
  status: ReduxStatus.IDLE,
  error: null,
};

const customerProfileSlice = createSlice({
  name: "customerProfile",
  initialState,
  reducers: {
    clearProfileError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    const pendingAction = (state: CustomerProfileState) => {
      state.status = ReduxStatus.LOADING;
      state.error = null;
    };
    const rejectedAction = (state: CustomerProfileState, action: any) => {
      state.status = ReduxStatus.FAILURE;
      state.error = action.payload as string;
    };

    builder
      // Profile
      .addCase(fetchMyProfile.pending, pendingAction)
      .addCase(fetchMyProfile.fulfilled, (state, action: PayloadAction<CustomerProfileDto>) => {
        state.status = ReduxStatus.SUCCESS;
        state.profile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, rejectedAction)
      .addCase(createMyProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile = { ...state.profile, ...action.payload };
        }
      })

      // Address
      .addCase(fetchMyAddresses.pending, pendingAction)
      .addCase(fetchMyAddresses.fulfilled, (state, action: PayloadAction<CustomerAddressDto[]>) => {
        state.status = ReduxStatus.SUCCESS;
        state.addresses = action.payload;
      })
      .addCase(fetchMyAddresses.rejected, rejectedAction)
      .addCase(createAddress.fulfilled, (state, action) => {
        if (action.payload.isDefault) {
          state.addresses.forEach(a => a.isDefault = false);
        }
        state.addresses.push(action.payload);
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        const index = state.addresses.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          if (action.payload.data.isDefault) {
            state.addresses.forEach(a => a.isDefault = false);
          }
          state.addresses[index] = { ...state.addresses[index], ...action.payload.data };
        }
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = state.addresses.filter(a => a.id !== action.payload);
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.addresses.forEach(a => {
          a.isDefault = a.id === action.payload;
        });
      })

      // KYC
      .addCase(fetchKyc.pending, pendingAction)
      .addCase(fetchKyc.fulfilled, (state, action: PayloadAction<CustomerKycDto>) => {
        state.status = ReduxStatus.SUCCESS;
        state.kyc = action.payload;
      })
      .addCase(fetchKyc.rejected, rejectedAction)
      .addCase(submitKyc.fulfilled, (state, action) => {
        state.kyc = action.payload;
      });
  },
});

export const { clearProfileError } = customerProfileSlice.actions;
export default customerProfileSlice.reducer;
