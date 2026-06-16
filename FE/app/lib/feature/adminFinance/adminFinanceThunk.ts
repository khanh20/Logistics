// ═══════════════════════════════════════════════════════════════════
// Admin Finance Thunks — Redux Toolkit async actions
// ═══════════════════════════════════════════════════════════════════

import { createAsyncThunk } from "@reduxjs/toolkit";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import { bankAccountApi } from "~/lib/api/bankAccount";
import type {
  ApproveWithdrawRequest,
  RejectWithdrawRequest,
  CreateFeeRuleDto,
  CreateVipTierDto,
  CreateTransactionTypeDto,
  UpdateTransactionTypeDto,
  CreateRefundDto,
  ReviewFraudDto,
  CreatePlatformReconcileDto,
} from "~/lib/types/adminFinance";
import type { CreateBankAccountDto } from "~/lib/types/bankAccount";
import type { ReleaseReasonEnum } from "~/lib/enums/finance";

// ── Withdraw Approval ────────────────────────────────────────────
export const fetchPendingWithdraws = createAsyncThunk(
  "adminFinance/fetchPendingWithdraws",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getPendingWithdraws();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách rút tiền chờ duyệt");
    }
  }
);

export const approveWithdraw = createAsyncThunk(
  "adminFinance/approveWithdraw",
  async ({ id, data }: { id: string; data: ApproveWithdrawRequest }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.approveWithdraw(id, data);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi duyệt rút tiền");
    }
  }
);

export const rejectWithdraw = createAsyncThunk(
  "adminFinance/rejectWithdraw",
  async ({ id, data }: { id: string; data: RejectWithdrawRequest }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.rejectWithdraw(id, data);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi từ chối rút tiền");
    }
  }
);

// ── Fee Rules ────────────────────────────────────────────────────
export const fetchFeeRules = createAsyncThunk(
  "adminFinance/fetchFeeRules",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllFeeRules();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải quy tắc phí");
    }
  }
);

export const createFeeRule = createAsyncThunk(
  "adminFinance/createFeeRule",
  async (data: CreateFeeRuleDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createFeeRule(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo quy tắc phí");
    }
  }
);

export const updateFeeRule = createAsyncThunk(
  "adminFinance/updateFeeRule",
  async ({ id, data }: { id: string; data: CreateFeeRuleDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateFeeRule(id, data);
      return { id, data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật quy tắc phí");
    }
  }
);

export const deleteFeeRule = createAsyncThunk(
  "adminFinance/deleteFeeRule",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteFeeRule(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xóa quy tắc phí");
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
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải hạng VIP");
    }
  }
);

export const createVipTier = createAsyncThunk(
  "adminFinance/createVipTier",
  async (data: CreateVipTierDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createVipTier(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo hạng VIP");
    }
  }
);

export const updateVipTier = createAsyncThunk(
  "adminFinance/updateVipTier",
  async ({ id, data }: { id: string; data: CreateVipTierDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateVipTier(id, data);
      return { id, data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật hạng VIP");
    }
  }
);

export const deleteVipTier = createAsyncThunk(
  "adminFinance/deleteVipTier",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteVipTier(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xóa hạng VIP");
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
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải loại giao dịch");
    }
  }
);

export const createTransactionType = createAsyncThunk(
  "adminFinance/createTransactionType",
  async (data: CreateTransactionTypeDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createTransactionType(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo loại giao dịch");
    }
  }
);

export const updateTransactionType = createAsyncThunk(
  "adminFinance/updateTransactionType",
  async ({ id, data }: { id: string; data: UpdateTransactionTypeDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.updateTransactionType(id, data);
      return { id, data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật loại giao dịch");
    }
  }
);

export const deleteTransactionType = createAsyncThunk(
  "adminFinance/deleteTransactionType",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.deleteTransactionType(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xóa loại giao dịch");
    }
  }
);

// ── Refunds ──────────────────────────────────────────────────────
export const fetchRefunds = createAsyncThunk(
  "adminFinance/fetchRefunds",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllRefunds();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách hoàn tiền");
    }
  }
);

export const createRefund = createAsyncThunk(
  "adminFinance/createRefund",
  async (data: CreateRefundDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createRefund(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo hoàn tiền");
    }
  }
);

export const approveRefund = createAsyncThunk(
  "adminFinance/approveRefund",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.approveRefund(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi duyệt hoàn tiền");
    }
  }
);

export const rejectRefund = createAsyncThunk(
  "adminFinance/rejectRefund",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.rejectRefund(id, reason);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi từ chối hoàn tiền");
    }
  }
);

// ── Fraud Detection ──────────────────────────────────────────────
export const fetchFraudCases = createAsyncThunk(
  "adminFinance/fetchFraudCases",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllFraudCases();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách gian lận");
    }
  }
);

export const reviewFraudCase = createAsyncThunk(
  "adminFinance/reviewFraudCase",
  async ({ id, data }: { id: string; data: ReviewFraudDto }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.reviewFraudCase(id, data);
      return { id, data };
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi review fraud case");
    }
  }
);

// ── Platform Reconcile ───────────────────────────────────────────
export const fetchReconciles = createAsyncThunk(
  "adminFinance/fetchReconciles",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllReconciles();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách đối soát");
    }
  }
);

export const createReconcile = createAsyncThunk(
  "adminFinance/createReconcile",
  async (data: CreatePlatformReconcileDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createReconcile(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo đối soát");
    }
  }
);

export const confirmReconcile = createAsyncThunk(
  "adminFinance/confirmReconcile",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.confirmReconcile(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xác nhận đối soát");
    }
  }
);

// ── Wallet Transaction ───────────────────────────────────────────
export const fetchWalletTransactions = createAsyncThunk(
  "adminFinance/fetchWalletTransactions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllWalletTransactions();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải lịch sử giao dịch");
    }
  }
);

// ── Bank Webhook Logs ────────────────────────────────────────────
export const fetchWebhookLogs = createAsyncThunk(
  "adminFinance/fetchWebhookLogs",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllWebhookLogs();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải webhook logs");
    }
  }
);

// ── Bank Accounts (System) ───────────────────────────────────────
export const fetchSystemBankAccounts = createAsyncThunk(
  "adminFinance/fetchSystemBankAccounts",
  async (_, { rejectWithValue }) => {
    try {
      const res = await bankAccountApi.getSystemBankAccounts();
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải tài khoản ngân hàng");
    }
  }
);

export const createSystemBankAccount = createAsyncThunk(
  "adminFinance/createSystemBankAccount",
  async (data: CreateBankAccountDto, { rejectWithValue }) => {
    try {
      const res = await bankAccountApi.create(data);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tạo tài khoản ngân hàng");
    }
  }
);

export const toggleBankAccountStatus = createAsyncThunk(
  "adminFinance/toggleBankAccountStatus",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.toggleStatus(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi cập nhật trạng thái");
    }
  }
);

export const deleteSystemBankAccount = createAsyncThunk(
  "adminFinance/deleteSystemBankAccount",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.delete(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi xóa tài khoản ngân hàng");
    }
  }
);

// ── Payment Locks ────────────────────────────────────────────────
export const fetchPaymentLocksByOrder = createAsyncThunk(
  "adminFinance/fetchPaymentLocksByOrder",
  async (orderId: string, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getPaymentLocksByOrder(orderId);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải payment locks");
    }
  }
);

export const releasePaymentLock = createAsyncThunk(
  "adminFinance/releasePaymentLock",
  async ({ id, reason }: { id: string; reason: ReleaseReasonEnum }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.releasePaymentLock(id, reason);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi giải phóng payment lock");
    }
  }
);

// ── Admin KYC ──────────────────────────────────────────────────
export const fetchAdminKycs = createAsyncThunk(
  "adminFinance/fetchAdminKycs",
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.getAllKycs();
      return res.data || res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi tải danh sách KYC");
    }
  }
);

export const approveAdminKyc = createAsyncThunk(
  "adminFinance/approveAdminKyc",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.approveKyc(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi phê duyệt KYC");
    }
  }
);

export const rejectAdminKyc = createAsyncThunk(
  "adminFinance/rejectAdminKyc",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      await adminFinanceApi.rejectKyc(id, reason);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Lỗi từ chối KYC");
    }
  }
);
