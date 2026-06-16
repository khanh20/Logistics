import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export const selectCustomerProfileState = (state: RootState) => state.customerProfileState;

export const selectProfile = createSelector([selectCustomerProfileState], (state) => state.profile);
export const selectAddresses = createSelector([selectCustomerProfileState], (state) => state.addresses);
export const selectKyc = createSelector([selectCustomerProfileState], (state) => state.kyc);

export const selectProfileStatus = createSelector([selectCustomerProfileState], (state) => state.status);
export const selectProfileError = createSelector([selectCustomerProfileState], (state) => state.error);
