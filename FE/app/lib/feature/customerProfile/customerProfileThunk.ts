// ═══════════════════════════════════════════════════════════════════
// Customer Profile Thunks
// ═══════════════════════════════════════════════════════════════════

import { createAsyncThunk } from "@reduxjs/toolkit";
import { customerProfileApi } from "~/lib/api/customerProfile";
import type {
  CreateCustomerProfileDto,
  UpdateCustomerProfileDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateKycFromOcrRequest,
} from "~/lib/types/customerProfile";

// ── Profile ──────────────────────────────────────────────────────
export const fetchMyProfile = createAsyncThunk(
  "customerProfile/fetchMyProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.getMyProfile();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải thông tin cá nhân");
    }
  }
);

export const createMyProfile = createAsyncThunk(
  "customerProfile/createMyProfile",
  async (data: CreateCustomerProfileDto, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.createMyProfile(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo thông tin cá nhân");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "customerProfile/updateProfile",
  async ({ id, data }: { id: string; data: UpdateCustomerProfileDto }, { rejectWithValue }) => {
    try {
      await customerProfileApi.updateProfile(id, data);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật thông tin cá nhân");
    }
  }
);

// ── Address ──────────────────────────────────────────────────────
export const fetchMyAddresses = createAsyncThunk(
  "customerProfile/fetchMyAddresses",
  async (_, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.getMyAddresses();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách địa chỉ");
    }
  }
);

export const createAddress = createAsyncThunk(
  "customerProfile/createAddress",
  async (data: CreateCustomerAddressDto, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.createAddress(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi thêm địa chỉ");
    }
  }
);

export const updateAddress = createAsyncThunk(
  "customerProfile/updateAddress",
  async ({ id, data }: { id: string; data: UpdateCustomerAddressDto }, { rejectWithValue }) => {
    try {
      await customerProfileApi.updateAddress(id, data);
      return { id, data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật địa chỉ");
    }
  }
);

export const deleteAddress = createAsyncThunk(
  "customerProfile/deleteAddress",
  async (id: string, { rejectWithValue }) => {
    try {
      await customerProfileApi.deleteAddress(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xóa địa chỉ");
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  "customerProfile/setDefaultAddress",
  async (id: string, { rejectWithValue }) => {
    try {
      await customerProfileApi.setDefaultAddress(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi đặt địa chỉ mặc định");
    }
  }
);

// ── KYC ──────────────────────────────────────────────────────────
export const fetchKyc = createAsyncThunk(
  "customerProfile/fetchKyc",
  async (_, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.getKyc();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải thông tin KYC");
    }
  }
);

export const submitKyc = createAsyncThunk(
  "customerProfile/submitKyc",
  async (data: UpdateKycFromOcrRequest, { rejectWithValue }) => {
    try {
      const res = await customerProfileApi.submitKyc(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi gửi hồ sơ KYC");
    }
  }
);
