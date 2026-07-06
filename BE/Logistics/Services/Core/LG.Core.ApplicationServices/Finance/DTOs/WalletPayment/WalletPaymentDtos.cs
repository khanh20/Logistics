using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.WalletPayment
{
    // ── Request DTOs ──────────────────────────────────────────────────────────

    /// <summary>
    /// Trừ tiền ví (đóng cọc, thanh toán cuối kỳ).
    /// Module1 gọi internal khi khách bấm "Đóng cọc" hoặc "Thanh toán cuối kỳ".
    /// </summary>
    public class WalletDeductRequest
    {
        [Required]
        public Guid CustomerId { get; set; }

        [Required]
        [Range(1, double.MaxValue, ErrorMessage = "Số tiền phải lớn hơn 0.")]
        public decimal AmountVnd { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReferenceType { get; set; } = default!;   // "OrderDeposit" | "OrderFinal"

        [Required]
        public Guid ReferenceId { get; set; }                    // OrderId

        [MaxLength(500)]
        public string? Note { get; set; }
    }

    /// <summary>
    /// Hoàn tiền ví (hủy đơn đã cọc).
    /// </summary>
    public class WalletRefundRequest
    {
        [Required]
        public Guid CustomerId { get; set; }

        [Required]
        [Range(1, double.MaxValue, ErrorMessage = "Số tiền phải lớn hơn 0.")]
        public decimal AmountVnd { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReferenceType { get; set; } = default!;   // "OrderRefund"

        [Required]
        public Guid ReferenceId { get; set; }                    // OrderId

        [MaxLength(500)]
        public string? Note { get; set; }
    }

    /// <summary>
    /// Yêu cầu tính phí checkout dựa trên FeeRule.
    /// Module1 gửi khi preview checkout.
    /// </summary>
    public class CalculateFeesRequest
    {
        [Required]
        public Guid CustomerId { get; set; }

        /// <summary>Hạng VIP của khách (null = lấy FeeRule mặc định).</summary>
        public Guid? VipTierId { get; set; }

        /// <summary>Platform ID (null = FeeRule chung).</summary>
        public Guid? PlatformId { get; set; }

        /// <summary>Tổng giá trị đơn hàng (VNĐ) — dùng để tính % phí.</summary>
        [Required]
        [Range(0, double.MaxValue)]
        public decimal SubtotalVnd { get; set; }

        /// <summary>Loại bảo hiểm: "none" | "basic" | "full"</summary>
        [MaxLength(10)]
        public string InsuranceOption { get; set; } = "none";

        [MaxLength(20)]
        public string ShippingLine { get; set; } = "Tmdt"; // "Tmdt" | "Bm" | "OfficialQuota"
    }

    /// <summary>
    /// Yêu cầu tính phí ship quốc tế cuối kỳ (khi có cân nặng/thể tích thực tế).
    /// </summary>
    public class CalculateShippingFeesRequest
    {
        public Guid? CustomerId { get; set; }
        public Guid? VipTierId { get; set; }
        public Guid? PlatformId { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal ActualWeightKg { get; set; }

        /// <summary>Thể tích (cm³) — dùng tính cân nặng thể tích.</summary>
        [Range(0, double.MaxValue)]
        public decimal? VolumeCm3 { get; set; }

        /// <summary>Số ngày lưu kho vượt miễn phí.</summary>
        [Range(0, int.MaxValue)]
        public int StorageDaysOverFree { get; set; } = 0;
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────

    public class WalletDeductResponse
    {
        public Guid WalletTransactionId { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
    }

    public class WalletRefundResponse
    {
        public Guid WalletTransactionId { get; set; }
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }
    }

    public class WalletBalanceResponse
    {
        public Guid WalletId { get; set; }
        public decimal AvailableBalance { get; set; }
        public decimal FrozenBalance { get; set; }
        public bool IsFrozen { get; set; }
    }

    public class CalculateFeesResponse
    {
        /// <summary>Phí dịch vụ (VNĐ).</summary>
        public decimal ServiceFeeVnd { get; set; }

        /// <summary>Phí kiểm hàng (VNĐ).</summary>
        public decimal InspectionFeeVnd { get; set; }

        /// <summary>Phí bảo hiểm (VNĐ) — 0 nếu không chọn.</summary>
        public decimal InsuranceFeeVnd { get; set; }

        /// <summary>Loại bảo hiểm đã áp dụng.</summary>
        public string InsuranceOption { get; set; } = "none";

        /// <summary>Phí ủy thác nhập khẩu (VNĐ) — chỉ áp dụng Chính ngạch.</summary>
        public decimal ImportEntrustmentFeeVnd { get; set; }

        /// <summary>Thuế VAT (VNĐ) — chỉ áp dụng Chính ngạch.</summary>
        public decimal ImportVatVnd { get; set; }

        /// <summary>Thuế nhập khẩu (VNĐ) — chỉ áp dụng Chính ngạch.</summary>
        public decimal ImportDutyVnd { get; set; }

        /// <summary>Tổng phí checkout (chưa gồm ship quốc tế).</summary>
        public decimal TotalCheckoutFeeVnd { get; set; }

        /// <summary>ID FeeRule đã sử dụng.</summary>
        public Guid? FeeRuleId { get; set; }

        /// <summary>Ưu đãi phí dịch vụ (VNĐ).</summary>
        public decimal ServiceFeeDiscountVnd { get; set; }

        /// <summary>Ưu đãi phí kiểm hàng (VNĐ).</summary>
        public decimal InspectionFeeDiscountVnd { get; set; }
    }

    public class CalculateShippingFeesResponse
    {
        /// <summary>Phí ship quốc tế (VNĐ).</summary>
        public decimal ShippingIntlFeeVnd { get; set; }

        /// <summary>Phí lưu kho (VNĐ).</summary>
        public decimal StorageFeeVnd { get; set; }

        /// <summary>Cân nặng tính cước (kg) — max(actual, volumetric, min).</summary>
        public decimal ChargeableWeightKg { get; set; }

        /// <summary>Tổng phí ship (ship quốc tế + lưu kho).</summary>
        public decimal TotalShippingFeeVnd { get; set; }

        /// <summary>Số ngày lưu kho tính phí (sau khi đã trừ ngày miễn phí).</summary>
        public int StorageDaysOverFree { get; set; }
    }
}
