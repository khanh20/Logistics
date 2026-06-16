// ═══════════════════════════════════════════════════════════════════
// Finance Enums — Tất cả enum finance đồng bộ từ Backend C#
// File riêng để clean code, dễ maintain và tái sử dụng
// ═══════════════════════════════════════════════════════════════════

// ── Bank ──────────────────────────────────────────────────────────
export enum BankAccountType {
  System = 1,
  Customer = 2,
}

export enum WebhookServiceEnum {
  Casso = 1,
  Sepay = 2,
  MbBankApi = 3,
  MoMo = 4,
  ZaloPay = 5,
}

export enum WebhookProcessingStatusEnum {
  Pending = "Pending",
  Matched = "Matched",
  Unmatched = "Unmatched",
  Error = "Error",
  Ignored = "Ignored",
  Failed = "Failed",
}

// ── Transaction ──────────────────────────────────────────────────
export enum TopupStatusEnum {
  Pending = 1,
  Matched = 2,
  Expired = 3,
  Cancelled = 4,
}

export enum WithdrawStatusEnum {
  Pending = 1,
  Approved = 2,
  Processing = 3,
  Completed = 4,
  Rejected = 5,
  Cancelled = 6,
}

export enum TransactionDirectionEnum {
  Credit = 1,
  Debit = 2,
}

// ── Refund ────────────────────────────────────────────────────────
export enum RefundStatusEnum {
  Pending = 1,
  Processing = 2,
  Completed = 3,
  Failed = 4,
}

export enum RefundReasonEnum {
  OrderCancelled = "OrderCancelled",
  ItemMissing = "ItemMissing",
  ItemDamaged = "ItemDamaged",
  Overcharged = "Overcharged",
  Other = "Other",
}

// ── Payment Lock ─────────────────────────────────────────────────
export enum PaymentLockStatusEnum {
  Active = 1,
  Released = 2,
  Expired = 3,
  Converted = 4,
}

export enum PaymentLockTypeEnum {
  Deposit = "Deposit",
  FinalPayment = "FinalPayment",
}

export enum ReleaseReasonEnum {
  OrderCompleted = "OrderCompleted",
  OrderCancelled = "OrderCancelled",
  Expired = "Expired",
  Manual = "Manual",
}

// ── Fraud Detection ──────────────────────────────────────────────
export enum FraudTypeEnum {
  MultipleTopupCancel = 1,
  SuspiciousWithdraw = 2,
  AccountTakeover = 3,
  ReferralAbuse = 4,
  VelocityAbuse = 5,
  Other = 6,
}

export enum FraudStatusEnum {
  Open = 1,
  Investigating = 2,
  Confirmed = 3,
  FalsePositive = 4,
}

export enum FraudActionEnum {
  Flag = 1,
  FreezeWallet = 2,
  BlockWithdraw = 3,
  ManualReview = 4,
}

// ── Reconcile ────────────────────────────────────────────────────
export enum ReconcileStatusEnum {
  Pending = "Pending",
  Matched = "Matched",
  Discrepancy = "Discrepancy",
}

// ── KYC ──────────────────────────────────────────────────────────
export enum KycStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
}

export enum KycLevel {
  None = 0,
  Basic = 1,
  Enhanced = 2,
}

// ── Customer ─────────────────────────────────────────────────────
export enum Gender {
  Male = 0,
  Female = 1,
  Other = 2,
}

export enum PreferredChannel {
  Zalo = 0,
  Email = 1,
  Sms = 2,
  App = 3,
}

// ── Email ────────────────────────────────────────────────────────
export enum EmailTemplateTypeEnum {
  OrderConfirmed = "OrderConfirmed",
  OrderShipped = "OrderShipped",
  OrderDelivered = "OrderDelivered",
  TopupSuccess = "TopupSuccess",
  WithdrawSuccess = "WithdrawSuccess",
  DebtReminder = "DebtReminder",
  VoucherExpiry = "VoucherExpiry",
  VipUpgrade = "VipUpgrade",
}

export enum NotificationDeliveryStatusEnum {
  Queued = "Queued",
  Sent = "Sent",
  Delivered = "Delivered",
  Failed = "Failed",
}
