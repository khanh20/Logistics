using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.Management
{
    public class DebtRecordDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public Guid CreditLimitId { get; set; }
        public Guid? LinkedOrderId { get; set; }
        public decimal DebtAmountVnd { get; set; }
        public DateOnly DueDate { get; set; }
        public bool IsPaid { get; set; }
        public DateTime? PaidAt { get; set; }
        public bool IsOverdue { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreditLimitDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public decimal MaxCreditVnd { get; set; }
        public decimal CurrentDebtVnd { get; set; }
        public decimal AvailableCreditVnd => MaxCreditVnd - CurrentDebtVnd;
        public short DueDateDays { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateCreditLimitDto
    {
        [Required]
        public Guid CustomerId { get; set; }
        [Required]
        public decimal MaxCreditVnd { get; set; }
        public short DueDateDays { get; set; } = 30;
        public bool IsActive { get; set; } = true;
    }
}
