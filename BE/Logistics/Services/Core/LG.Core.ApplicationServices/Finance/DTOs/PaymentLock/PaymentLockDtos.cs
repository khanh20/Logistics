using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.PaymentLock
{
    public class PaymentLockDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid OrderId { get; set; }
        public PaymentLockTypeEnum LockType { get; set; }
        public decimal LockedAmountVnd { get; set; }
        public PaymentLockStatusEnum Status { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
        public ReleaseReasonEnum? ReleaseReason { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreatePaymentLockDto
    {
        [Required]
        public Guid WalletId { get; set; }

        [Required]
        public Guid OrderId { get; set; }

        [Required]
        public PaymentLockTypeEnum LockType { get; set; }

        [Required]
        public decimal LockedAmountVnd { get; set; }

        [Required]
        public DateTime ExpiresAt { get; set; }
    }
}
