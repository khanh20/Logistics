// ═══════════════════════════════════════════════════════════════════
// Finance Validations — Ant Design Form rules tập trung
// File riêng để clean code, reusable giữa các form
// ═══════════════════════════════════════════════════════════════════

import type { Rule } from "antd/es/form";

// ── Shared Rules ─────────────────────────────────────────────────
export const REQUIRED_RULE: Rule = { required: true, message: "Trường này là bắt buộc" };

export const maxLength = (max: number, label?: string): Rule => ({
  max,
  message: `${label || "Trường này"} không được vượt quá ${max} ký tự`,
});

export const minValue = (min: number, label?: string): Rule => ({
  type: "number",
  min,
  message: `${label || "Giá trị"} tối thiểu là ${min.toLocaleString()}`,
});

export const maxValue = (max: number, label?: string): Rule => ({
  type: "number",
  max,
  message: `${label || "Giá trị"} tối đa là ${max.toLocaleString()}`,
});

// ── Topup Rules ──────────────────────────────────────────────────
export const TOPUP_RULES = {
  bankAccountId: [REQUIRED_RULE],
  amount: [
    { required: true, message: "Vui lòng nhập số tiền nạp" },
    { type: "number" as const, min: 10000, message: "Số tiền tối thiểu là 10,000₫" },
    { type: "number" as const, max: 1_000_000_000, message: "Số tiền tối đa là 1,000,000,000₫" },
  ] as Rule[],
};

// ── Withdraw Rules ───────────────────────────────────────────────
export const WITHDRAW_RULES = {
  bankAccountId: [{ required: true, message: "Vui lòng chọn tài khoản ngân hàng" }] as Rule[],
  amount: [
    { required: true, message: "Vui lòng nhập số tiền rút" },
    { type: "number" as const, min: 50000, message: "Số tiền rút tối thiểu là 50,000₫" },
    { type: "number" as const, max: 1_000_000_000, message: "Số tiền rút tối đa là 1,000,000,000₫" },
  ] as Rule[],
};

// ── Bank Account Rules ───────────────────────────────────────────
export const BANK_ACCOUNT_RULES = {
  bankName: [
    REQUIRED_RULE,
    maxLength(100, "Tên ngân hàng"),
  ] as Rule[],
  bankCode: [
    REQUIRED_RULE,
    maxLength(20, "Mã ngân hàng"),
  ] as Rule[],
  accountNumber: [
    REQUIRED_RULE,
    maxLength(50, "Số tài khoản"),
  ] as Rule[],
  accountHolder: [
    REQUIRED_RULE,
    maxLength(255, "Tên chủ tài khoản"),
  ] as Rule[],
  branch: [
    maxLength(255, "Chi nhánh"),
  ] as Rule[],
};

// ── Customer Address Rules ───────────────────────────────────────
export const CUSTOMER_ADDRESS_RULES = {
  label: [
    maxLength(100, "Nhãn địa chỉ"),
  ] as Rule[],
  recipientName: [
    REQUIRED_RULE,
    maxLength(255, "Tên người nhận"),
  ] as Rule[],
  phone: [
    REQUIRED_RULE,
    maxLength(20, "Số điện thoại"),
    { pattern: /^[0-9+\-\s]+$/, message: "Số điện thoại không hợp lệ" },
  ] as Rule[],
  addressLine: [
    REQUIRED_RULE,
  ] as Rule[],
  wardCode: [maxLength(20)] as Rule[],
  districtCode: [maxLength(20)] as Rule[],
  provinceCode: [maxLength(20)] as Rule[],
};

// ── Customer Profile Rules ───────────────────────────────────────
export const CUSTOMER_PROFILE_RULES = {
  customerCode: [
    REQUIRED_RULE,
    maxLength(30, "Mã khách hàng"),
  ] as Rule[],
  fullName: [
    maxLength(255, "Họ tên"),
  ] as Rule[],
  zaloUserId: [
    maxLength(100, "Zalo User ID"),
  ] as Rule[],
};

// ── KYC Rules ────────────────────────────────────────────────────
export const KYC_RULES = {
  idNumber: [
    { required: true, message: "Vui lòng nhập số CCCD" },
    { pattern: /^\d{9,12}$/, message: "Số CCCD phải từ 9-12 chữ số" },
  ] as Rule[],
  fullNameOnId: [
    { required: true, message: "Vui lòng nhập họ tên trên giấy tờ" },
    maxLength(255, "Họ tên"),
  ] as Rule[],
};

// ── Fee Rule Rules ───────────────────────────────────────────────
export const FEE_RULE_RULES = {
  name: [
    REQUIRED_RULE,
    maxLength(100, "Tên quy tắc"),
  ] as Rule[],
  effectiveFrom: [
    { required: true, message: "Vui lòng chọn ngày bắt đầu" },
  ] as Rule[],
  serviceFeePct: [
    { type: "number" as const, min: 0, max: 1, message: "Phí phải từ 0 đến 1 (100%)" },
  ] as Rule[],
};

// ── Transaction Type Rules ───────────────────────────────────────
export const TRANSACTION_TYPE_RULES = {
  code: [
    REQUIRED_RULE,
    maxLength(50, "Mã loại giao dịch"),
  ] as Rule[],
  name: [
    REQUIRED_RULE,
    maxLength(100, "Tên loại giao dịch"),
  ] as Rule[],
};

// ── VIP Tier Rules ───────────────────────────────────────────────
export const VIP_TIER_RULES = {
  name: [
    REQUIRED_RULE,
    maxLength(50, "Tên hạng VIP"),
  ] as Rule[],
  level: [
    { required: true, message: "Vui lòng nhập cấp độ" },
  ] as Rule[],
  minSpendVnd: [
    { required: true, message: "Vui lòng nhập mức chi tiêu tối thiểu" },
  ] as Rule[],
  colorHex: [
    maxLength(6, "Mã màu"),
    { pattern: /^[0-9a-fA-F]{0,6}$/, message: "Mã màu HEX không hợp lệ" },
  ] as Rule[],
};

// ── Refund Rules ─────────────────────────────────────────────────
export const REFUND_RULES = {
  walletId: [REQUIRED_RULE] as Rule[],
  referenceType: [
    REQUIRED_RULE,
    maxLength(50, "Loại tham chiếu"),
  ] as Rule[],
  referenceId: [REQUIRED_RULE] as Rule[],
  grossAmountVnd: [
    { required: true, message: "Vui lòng nhập số tiền hoàn" },
    { type: "number" as const, min: 0, message: "Số tiền phải lớn hơn 0" },
  ] as Rule[],
  penaltyPct: [
    { required: true, message: "Vui lòng nhập phần trăm phạt!" }
  ] as Rule[],
};

// ── Approve Withdraw Rules ────────────────────────────────────────
export const APPROVE_WITHDRAW_RULES = {
  transferRef: [
    { required: true, message: "Vui lòng nhập mã giao dịch!" },
    maxLength(100, "Mã giao dịch"),
  ] as Rule[],
};

// ── Reject Withdraw Rules ────────────────────────────────────────
export const REJECT_WITHDRAW_RULES = {
  reason: [
    { required: true, message: "Vui lòng nhập lý do từ chối!" },
    maxLength(500, "Lý do"),
  ] as Rule[],
};

// ── Fraud Review Rules ───────────────────────────────────────────
export const FRAUD_REVIEW_RULES = {
  status: [REQUIRED_RULE] as Rule[],
  resolutionNote: [
    maxLength(1000, "Ghi chú"),
  ] as Rule[],
};

// ── Platform Reconcile Rules ─────────────────────────────────────
export const PLATFORM_RECONCILE_RULES = {
  reconcileDate: [REQUIRED_RULE] as Rule[],
  platformId: [REQUIRED_RULE] as Rule[],
  platformAccountId: [REQUIRED_RULE] as Rule[],
  cnySpent: [
    { required: true, message: "Vui lòng nhập số CNY đã chi" },
  ] as Rule[],
  vndEquivalent: [
    { required: true, message: "Vui lòng nhập quy đổi VND" },
  ] as Rule[],
  serviceFeeCollectedVnd: [
    { required: true, message: "Vui lòng nhập phí dịch vụ" },
  ] as Rule[],
  alipayStatementUrl: [
    maxLength(500, "URL statement"),
  ] as Rule[],
};

// ── Credit Limit Rules ───────────────────────────────────────────
export const CREDIT_LIMIT_RULES = {
  customerId: [REQUIRED_RULE] as Rule[],
  maxCreditVnd: [
    { required: true, message: "Vui lòng nhập hạn mức tín dụng" },
  ] as Rule[],
};

// ── Payment Lock Rules ───────────────────────────────────────────
export const PAYMENT_LOCK_RULES = {
  walletId: [REQUIRED_RULE] as Rule[],
  orderId: [REQUIRED_RULE] as Rule[],
  lockType: [REQUIRED_RULE] as Rule[],
  lockedAmountVnd: [
    { required: true, message: "Vui lòng nhập số tiền giữ" },
  ] as Rule[],
  expiresAt: [
    { required: true, message: "Vui lòng chọn thời gian hết hạn" },
  ] as Rule[],
};

// ── Email Notification Rules ─────────────────────────────────────
export const EMAIL_NOTIFICATION_RULES = {
  customerId: [REQUIRED_RULE] as Rule[],
  toEmail: [
    REQUIRED_RULE,
    { type: "email" as const, message: "Email không hợp lệ" },
    maxLength(100, "Email"),
  ] as Rule[],
  subject: [REQUIRED_RULE] as Rule[],
};
