import { createAsyncThunk } from "@reduxjs/toolkit";
import { normalizeError } from "~/lib/utils/errors";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import { bankAccountApi } from "~/lib/api/bankAccount";
import type {
  ApproveWithdrawRequest,
  RejectWithdrawRequest,
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải danh sách rút tiền chờ duyệt"
      );
    }
  }
);

export const approveWithdraw = createAsyncThunk(
  "adminFinance/approveWithdraw",
  async (
    { id, data }: { id: string; data: ApproveWithdrawRequest },
    { rejectWithValue }
  ) => {
    try {
      await adminFinanceApi.approveWithdraw(id, data);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi duyệt rút tiền");
    }
  }
);

export const rejectWithdraw = createAsyncThunk(
  "adminFinance/rejectWithdraw",
  async (
    { id, data }: { id: string; data: RejectWithdrawRequest },
    { rejectWithValue }
  ) => {
    try {
      await adminFinanceApi.rejectWithdraw(id, data);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi từ chối rút tiền"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải danh sách hoàn tiền"
      );
    }
  }
);

export const createRefund = createAsyncThunk(
  "adminFinance/createRefund",
  async (data: CreateRefundDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createRefund(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tạo hoàn tiền");
    }
  }
);

export const approveRefund = createAsyncThunk(
  "adminFinance/approveRefund",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.approveRefund(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi duyệt hoàn tiền"
      );
    }
  }
);

export const rejectRefund = createAsyncThunk(
  "adminFinance/rejectRefund",
  async (
    { id, reason }: { id: string; reason: string },
    { rejectWithValue }
  ) => {
    try {
      await adminFinanceApi.rejectRefund(id, reason);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi từ chối hoàn tiền"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải danh sách gian lận"
      );
    }
  }
);

export const reviewFraudCase = createAsyncThunk(
  "adminFinance/reviewFraudCase",
  async (
    { id, data }: { id: string; data: ReviewFraudDto },
    { rejectWithValue }
  ) => {
    try {
      await adminFinanceApi.reviewFraudCase(id, data);
      return { id, data };
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi review fraud case"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải danh sách đối soát"
      );
    }
  }
);

export const createReconcile = createAsyncThunk(
  "adminFinance/createReconcile",
  async (data: CreatePlatformReconcileDto, { rejectWithValue }) => {
    try {
      const res = await adminFinanceApi.createReconcile(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message || "Lỗi tạo đối soát");
    }
  }
);

export const confirmReconcile = createAsyncThunk(
  "adminFinance/confirmReconcile",
  async (id: string, { rejectWithValue }) => {
    try {
      await adminFinanceApi.confirmReconcile(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi xác nhận đối soát"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải lịch sử giao dịch"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải webhook logs"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải tài khoản ngân hàng"
      );
    }
  }
);

export const createSystemBankAccount = createAsyncThunk(
  "adminFinance/createSystemBankAccount",
  async (data: CreateBankAccountDto, { rejectWithValue }) => {
    try {
      const res = await bankAccountApi.create(data);
      return res.data;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tạo tài khoản ngân hàng"
      );
    }
  }
);

export const toggleBankAccountStatus = createAsyncThunk(
  "adminFinance/toggleBankAccountStatus",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.toggleStatus(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi cập nhật trạng thái"
      );
    }
  }
);

export const deleteSystemBankAccount = createAsyncThunk(
  "adminFinance/deleteSystemBankAccount",
  async (id: string, { rejectWithValue }) => {
    try {
      await bankAccountApi.delete(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi xóa tài khoản ngân hàng"
      );
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
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi tải payment locks"
      );
    }
  }
);

export const releasePaymentLock = createAsyncThunk(
  "adminFinance/releasePaymentLock",
  async (
    { id, reason }: { id: string; reason: ReleaseReasonEnum },
    { rejectWithValue }
  ) => {
    try {
      await adminFinanceApi.releasePaymentLock(id, reason);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        normalizeError(err).message || "Lỗi giải phóng payment lock"
      );
    }
  }
);
