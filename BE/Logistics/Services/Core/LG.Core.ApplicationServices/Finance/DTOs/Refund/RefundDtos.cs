using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.Refund
{
    public class RefundDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid? TriggeredBy { get; set; }
        public RefundReasonEnum? Reason { get; set; }
        public string ReferenceType { get; set; }
        public Guid ReferenceId { get; set; }
        public decimal GrossAmountVnd { get; set; }
        public decimal PenaltyPct { get; set; }
        public decimal PenaltyVnd { get; set; }
        public decimal NetRefundVnd { get; set; }
        public RefundStatusEnum Status { get; set; }
        public DateTime? RefundedAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreateRefundDto
    {
        [Required]
        public Guid WalletId { get; set; }

        public RefundReasonEnum? Reason { get; set; }

        [Required]
        [MaxLength(50)]
        public string ReferenceType { get; set; }

        [Required]
        public Guid ReferenceId { get; set; }

        [Required]
        public decimal GrossAmountVnd { get; set; }

        public decimal PenaltyPct { get; set; } = 0;
    }
}
