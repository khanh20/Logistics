// ═══════════════════════════════════════════════════════════════════
// Finance Constants — Labels tiếng Việt, Colors cho UI Tags
// File riêng để dễ maintain và đảm bảo consistency
// ═══════════════════════════════════════════════════════════════════

import {
  TopupStatusEnum,
  WithdrawStatusEnum,
  RefundStatusEnum,
  FraudStatusEnum,
  FraudTypeEnum,
  FraudActionEnum,
  ReconcileStatusEnum,
  PaymentLockStatusEnum,
  PaymentLockTypeEnum,
  ReleaseReasonEnum,
  BankAccountType,
  WebhookProcessingStatusEnum,
  WebhookServiceEnum,
  KycStatus,
  KycLevel,
  Gender,
  PreferredChannel,
  TransactionDirectionEnum,
  RefundReasonEnum,
  NotificationDeliveryStatusEnum,
} from "~/lib/enums/finance";

// ── Topup Status ─────────────────────────────────────────────────
export const TOPUP_STATUS_LABELS: Record<TopupStatusEnum, string> = {
  [TopupStatusEnum.Pending]: "Chờ xử lý",
  [TopupStatusEnum.Matched]: "Thành công",
  [TopupStatusEnum.Expired]: "Hết hạn",
  [TopupStatusEnum.Cancelled]: "Đã hủy",
};

export const TOPUP_STATUS_COLORS: Record<TopupStatusEnum, string> = {
  [TopupStatusEnum.Pending]: "processing",
  [TopupStatusEnum.Matched]: "success",
  [TopupStatusEnum.Expired]: "warning",
  [TopupStatusEnum.Cancelled]: "default",
};

// ── Withdraw Status ──────────────────────────────────────────────
export const WITHDRAW_STATUS_LABELS: Record<WithdrawStatusEnum, string> = {
  [WithdrawStatusEnum.Pending]: "Chờ duyệt",
  [WithdrawStatusEnum.Approved]: "Đã duyệt",
  [WithdrawStatusEnum.Processing]: "Đang xử lý",
  [WithdrawStatusEnum.Completed]: "Hoàn tất",
  [WithdrawStatusEnum.Rejected]: "Từ chối",
  [WithdrawStatusEnum.Cancelled]: "Đã hủy",
};

export const WITHDRAW_STATUS_COLORS: Record<WithdrawStatusEnum, string> = {
  [WithdrawStatusEnum.Pending]: "processing",
  [WithdrawStatusEnum.Approved]: "cyan",
  [WithdrawStatusEnum.Processing]: "blue",
  [WithdrawStatusEnum.Completed]: "success",
  [WithdrawStatusEnum.Rejected]: "error",
  [WithdrawStatusEnum.Cancelled]: "default",
};

// ── Refund Status ────────────────────────────────────────────────
export const REFUND_STATUS_LABELS: Record<RefundStatusEnum, string> = {
  [RefundStatusEnum.Pending]: "Chờ duyệt",
  [RefundStatusEnum.Processing]: "Đang xử lý",
  [RefundStatusEnum.Completed]: "Hoàn tất",
  [RefundStatusEnum.Failed]: "Thất bại",
};

export const REFUND_STATUS_COLORS: Record<RefundStatusEnum, string> = {
  [RefundStatusEnum.Pending]: "processing",
  [RefundStatusEnum.Processing]: "blue",
  [RefundStatusEnum.Completed]: "success",
  [RefundStatusEnum.Failed]: "error",
};

export const REFUND_REASON_LABELS: Record<RefundReasonEnum, string> = {
  [RefundReasonEnum.OrderCancelled]: "Hủy đơn hàng",
  [RefundReasonEnum.ItemMissing]: "Thiếu hàng",
  [RefundReasonEnum.ItemDamaged]: "Hàng hỏng",
  [RefundReasonEnum.Overcharged]: "Tính phí dư",
  [RefundReasonEnum.Other]: "Khác",
};

// ── Fraud Status ─────────────────────────────────────────────────
export const FRAUD_STATUS_LABELS: Record<FraudStatusEnum, string> = {
  [FraudStatusEnum.Open]: "Mở",
  [FraudStatusEnum.Investigating]: "Đang điều tra",
  [FraudStatusEnum.Confirmed]: "Xác nhận",
  [FraudStatusEnum.FalsePositive]: "Nhầm lẫn",
};

export const FRAUD_STATUS_COLORS: Record<FraudStatusEnum, string> = {
  [FraudStatusEnum.Open]: "warning",
  [FraudStatusEnum.Investigating]: "processing",
  [FraudStatusEnum.Confirmed]: "error",
  [FraudStatusEnum.FalsePositive]: "default",
};

export const FRAUD_TYPE_LABELS: Record<FraudTypeEnum, string> = {
  [FraudTypeEnum.MultipleTopupCancel]: "Hủy nạp tiền nhiều lần",
  [FraudTypeEnum.SuspiciousWithdraw]: "Rút tiền đáng ngờ",
  [FraudTypeEnum.AccountTakeover]: "Chiếm đoạt tài khoản",
  [FraudTypeEnum.ReferralAbuse]: "Lạm dụng giới thiệu",
  [FraudTypeEnum.VelocityAbuse]: "Giao dịch bất thường",
  [FraudTypeEnum.Other]: "Khác",
};

export const FRAUD_ACTION_LABELS: Record<FraudActionEnum, string> = {
  [FraudActionEnum.Flag]: "Đánh dấu",
  [FraudActionEnum.FreezeWallet]: "Đóng băng ví",
  [FraudActionEnum.BlockWithdraw]: "Chặn rút tiền",
  [FraudActionEnum.ManualReview]: "Kiểm tra thủ công",
};

// ── Reconcile Status ─────────────────────────────────────────────
export const RECONCILE_STATUS_LABELS: Record<ReconcileStatusEnum, string> = {
  [ReconcileStatusEnum.Pending]: "Chờ đối soát",
  [ReconcileStatusEnum.Matched]: "Khớp",
  [ReconcileStatusEnum.Discrepancy]: "Chênh lệch",
};

export const RECONCILE_STATUS_COLORS: Record<ReconcileStatusEnum, string> = {
  [ReconcileStatusEnum.Pending]: "processing",
  [ReconcileStatusEnum.Matched]: "success",
  [ReconcileStatusEnum.Discrepancy]: "error",
};

// ── Payment Lock Status ──────────────────────────────────────────
export const PAYMENT_LOCK_STATUS_LABELS: Record<PaymentLockStatusEnum, string> = {
  [PaymentLockStatusEnum.Active]: "Đang giữ",
  [PaymentLockStatusEnum.Released]: "Đã giải phóng",
  [PaymentLockStatusEnum.Expired]: "Hết hạn",
  [PaymentLockStatusEnum.Converted]: "Đã chuyển đổi",
};

export const PAYMENT_LOCK_STATUS_COLORS: Record<PaymentLockStatusEnum, string> = {
  [PaymentLockStatusEnum.Active]: "processing",
  [PaymentLockStatusEnum.Released]: "success",
  [PaymentLockStatusEnum.Expired]: "warning",
  [PaymentLockStatusEnum.Converted]: "cyan",
};

export const PAYMENT_LOCK_TYPE_LABELS: Record<PaymentLockTypeEnum, string> = {
  [PaymentLockTypeEnum.Deposit]: "Đặt cọc",
  [PaymentLockTypeEnum.FinalPayment]: "Thanh toán cuối",
};

export const RELEASE_REASON_LABELS: Record<ReleaseReasonEnum, string> = {
  [ReleaseReasonEnum.OrderCompleted]: "Hoàn thành đơn",
  [ReleaseReasonEnum.OrderCancelled]: "Hủy đơn",
  [ReleaseReasonEnum.Expired]: "Hết hạn",
  [ReleaseReasonEnum.Manual]: "Thủ công",
};

// ── Bank Account Type ────────────────────────────────────────────
export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  [BankAccountType.System]: "Hệ thống",
  [BankAccountType.Customer]: "Khách hàng",
};

// ── Webhook ──────────────────────────────────────────────────────
export const WEBHOOK_PROCESSING_STATUS_LABELS: Record<WebhookProcessingStatusEnum, string> = {
  [WebhookProcessingStatusEnum.Pending]: "Chờ xử lý",
  [WebhookProcessingStatusEnum.Matched]: "Khớp",
  [WebhookProcessingStatusEnum.Unmatched]: "Không khớp",
  [WebhookProcessingStatusEnum.Error]: "Lỗi",
  [WebhookProcessingStatusEnum.Ignored]: "Bỏ qua",
  [WebhookProcessingStatusEnum.Failed]: "Thất bại",
};

export const WEBHOOK_SERVICE_LABELS: Record<WebhookServiceEnum, string> = {
  [WebhookServiceEnum.Casso]: "Casso",
  [WebhookServiceEnum.Sepay]: "Sepay",
  [WebhookServiceEnum.MbBankApi]: "MB Bank API",
  [WebhookServiceEnum.MoMo]: "MoMo",
  [WebhookServiceEnum.ZaloPay]: "ZaloPay",
};

// ── KYC ──────────────────────────────────────────────────────────
export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  [KycStatus.Pending]: "Chờ duyệt",
  [KycStatus.Approved]: "Đã duyệt",
  [KycStatus.Rejected]: "Từ chối",
};

export const KYC_STATUS_COLORS: Record<KycStatus, string> = {
  [KycStatus.Pending]: "processing",
  [KycStatus.Approved]: "success",
  [KycStatus.Rejected]: "error",
};

export const KYC_LEVEL_LABELS: Record<KycLevel, string> = {
  [KycLevel.None]: "Chưa xác minh",
  [KycLevel.Basic]: "Cơ bản",
  [KycLevel.Enhanced]: "Nâng cao",
};

// ── Gender ───────────────────────────────────────────────────────
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.Male]: "Nam",
  [Gender.Female]: "Nữ",
  [Gender.Other]: "Khác",
};

// ── Preferred Channel ────────────────────────────────────────────
export const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  [PreferredChannel.Zalo]: "Zalo",
  [PreferredChannel.Email]: "Email",
  [PreferredChannel.Sms]: "SMS",
  [PreferredChannel.App]: "App",
};

// ── Transaction Direction ────────────────────────────────────────
export const TRANSACTION_DIRECTION_LABELS: Record<TransactionDirectionEnum, string> = {
  [TransactionDirectionEnum.Credit]: "Cộng tiền",
  [TransactionDirectionEnum.Debit]: "Trừ tiền",
};

export const TRANSACTION_DIRECTION_COLORS: Record<TransactionDirectionEnum, string> = {
  [TransactionDirectionEnum.Credit]: "success",
  [TransactionDirectionEnum.Debit]: "error",
};

// ── Notification ─────────────────────────────────────────────────
export const NOTIFICATION_DELIVERY_STATUS_LABELS: Record<NotificationDeliveryStatusEnum, string> = {
  [NotificationDeliveryStatusEnum.Queued]: "Trong hàng đợi",
  [NotificationDeliveryStatusEnum.Sent]: "Đã gửi",
  [NotificationDeliveryStatusEnum.Delivered]: "Đã nhận",
  [NotificationDeliveryStatusEnum.Failed]: "Thất bại",
};
