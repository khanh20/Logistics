import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeError } from "~/lib/utils/errors";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import type {
  CreateFeeRuleDto,
  CreateVipTierDto,
  CreateTransactionTypeDto,
  UpdateTransactionTypeDto,
} from "~/lib/types/adminFinance";

// ── Fee Rules ────────────────────────────────────────────────────
export const fetchFeeRules = createAsyncThunk(
  "adminFinance/fetchFeeRules",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllFeeRules();
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tải quy tắc phí");
    }
  }
);

export const createFeeRule = createAsyncThunk(
  "adminFinance/createFeeRule",
  async (data: CreateFeeRuleDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createFeeRule(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tạo quy tắc phí");
    }
  }
);

export const updateFeeRule = createAsyncThunk(
  "adminFinance/updateFeeRule",
  async ({ id, data }: { id: string; data: CreateFeeRuleDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateFeeRule(id, data);
      return { id, data };
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi cập nhật quy tắc phí");
    }
  }
);

export const deleteFeeRule = createAsyncThunk(
  "adminFinance/deleteFeeRule",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteFeeRule(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi xóa quy tắc phí");
    }
  }
);

// ── VIP Tiers ────────────────────────────────────────────────────
export const fetchVipTiers = createAsyncThunk(
  "adminFinance/fetchVipTiers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllVipTiers();
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tải hạng VIP");
    }
  }
);

export const createVipTier = createAsyncThunk(
  "adminFinance/createVipTier",
  async (data: CreateVipTierDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createVipTier(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tạo hạng VIP");
    }
  }
);

export const updateVipTier = createAsyncThunk(
  "adminFinance/updateVipTier",
  async ({ id, data }: { id: string; data: CreateVipTierDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateVipTier(id, data);
      return { id, data };
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi cập nhật hạng VIP");
    }
  }
);

export const deleteVipTier = createAsyncThunk(
  "adminFinance/deleteVipTier",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteVipTier(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi xóa hạng VIP");
    }
  }
);

// ── Transaction Types ────────────────────────────────────────────
export const fetchTransactionTypes = createAsyncThunk(
  "adminFinance/fetchTransactionTypes",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllTransactionTypes();
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tải loại giao dịch");
    }
  }
);

export const createTransactionType = createAsyncThunk(
  "adminFinance/createTransactionType",
  async (data: CreateTransactionTypeDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createTransactionType(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tạo loại giao dịch");
    }
  }
);

export const updateTransactionType = createAsyncThunk(
  "adminFinance/updateTransactionType",
  async ({ id, data }: { id: string; data: UpdateTransactionTypeDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateTransactionType(id, data);
      return { id, data };
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi cập nhật loại giao dịch");
    }
  }
);

export const deleteTransactionType = createAsyncThunk(
  "adminFinance/deleteTransactionType",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteTransactionType(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi xóa loại giao dịch");
    }
  }
);
