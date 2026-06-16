import { createAsyncThunk } from "@reduxjs/toolkit";
import { financeApi } from "../../api/finance";
import type { 
  CreateTopupDto, 
  CreateWithdrawDto 
} from "../../types/finance";
import { bankAccountApi } from "../../api/bankAccount";
import type { CreateBankAccountDto } from "../../types/bankAccount";

export const fetchMyWallet = createAsyncThunk(
  "finance/fetchMyWallet",
  async (_, { rejectWithValue }) => {
    try {
      const response = await financeApi.getMyWallet();
      if (!response.data) throw new Error(response.message || "Failed to fetch wallet");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const fetchMyTopups = createAsyncThunk(
  "finance/fetchMyTopups",
  async (_, { rejectWithValue }) => {
    try {
      const response = await financeApi.getMyTopups();
      if (!response.data) throw new Error(response.message || "Failed to fetch topups");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const submitTopup = createAsyncThunk(
  "finance/submitTopup",
  async (data: CreateTopupDto, { rejectWithValue }) => {
    try {
      const response = await financeApi.createTopup(data);
      if (!response.data) throw new Error(response.message || "Failed to create topup");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const fetchMyWithdraws = createAsyncThunk(
  "finance/fetchMyWithdraws",
  async (_, { rejectWithValue }) => {
    try {
      const response = await financeApi.getMyWithdraws();
      if (!response.data) throw new Error(response.message || "Failed to fetch withdraws");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const submitWithdraw = createAsyncThunk(
  "finance/submitWithdraw",
  async (data: CreateWithdrawDto, { rejectWithValue }) => {
    try {
      const response = await financeApi.createWithdraw(data);
      if (!response.data) throw new Error(response.message || "Failed to create withdraw");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

// ── ZaloPay ────────────────────────────────────────────────────
export const createZaloPayPayment = createAsyncThunk(
  "finance/createZaloPayPayment",
  async (topupId: string, { rejectWithValue }) => {
    try {
      const response = await financeApi.createZaloPayPayment(topupId);
      if (!response.data) throw new Error(response.message || "Failed to create ZaloPay payment");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

// ── Bank Accounts ──────────────────────────────────────────────
export const fetchMyBankAccounts = createAsyncThunk(
  "finance/fetchMyBankAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await bankAccountApi.getMyBankAccounts();
      if (!response.data) throw new Error(response.message || "Failed to fetch bank accounts");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const fetchSystemBankAccounts = createAsyncThunk(
  "finance/fetchSystemBankAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await bankAccountApi.getSystemBankAccounts();
      if (!response.data) throw new Error(response.message || "Failed to fetch system bank accounts");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const createMyBankAccount = createAsyncThunk(
  "finance/createMyBankAccount",
  async (data: CreateBankAccountDto, { rejectWithValue }) => {
    try {
      const response = await bankAccountApi.create(data);
      if (!response.data) throw new Error(response.message || "Failed to create bank account");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const toggleMyBankAccountStatus = createAsyncThunk(
  "finance/toggleMyBankAccountStatus",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.toggleStatus(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const deleteMyBankAccount = createAsyncThunk(
  "finance/deleteMyBankAccount",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.delete(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);
