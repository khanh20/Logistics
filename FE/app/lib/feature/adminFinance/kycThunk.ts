import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeError } from "~/lib/utils/errors";
import { adminFinanceApi } from "~/lib/api/adminFinance";

// ── Admin KYC ──────────────────────────────────────────────────
export const fetchAdminKycs = createAsyncThunk(
  "adminFinance/fetchAdminKycs",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllKycs();
      return res.data || res;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tải danh sách KYC");
    }
  }
);

export const approveAdminKyc = createAsyncThunk(
  "adminFinance/approveAdminKyc",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.approveKyc(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi phê duyệt KYC");
    }
  }
);

export const rejectAdminKyc = createAsyncThunk(
  "adminFinance/rejectAdminKyc",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.rejectKyc(id, reason);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi từ chối KYC");
    }
  }
);
