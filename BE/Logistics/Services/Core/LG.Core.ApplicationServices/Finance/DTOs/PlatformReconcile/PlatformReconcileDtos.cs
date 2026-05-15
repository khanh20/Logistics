using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile
{
    public class PlatformReconcileDto
    {
        public Guid Id { get; set; }
        public DateOnly ReconcileDate { get; set; }
        public Guid PlatformId { get; set; }
        public Guid PlatformAccountId { get; set; }
        public decimal CnySpent { get; set; }
        public decimal VndEquivalent { get; set; }
        public decimal ServiceFeeCollectedVnd { get; set; }
        public decimal? VarianceVnd { get; set; }
        public string? AlipayStatementUrl { get; set; }
        public ReconcileStatusEnum Status { get; set; }
        public string? Notes { get; set; }
        public Guid? ReconciledBy { get; set; }
        public DateTime? ReconciledAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class CreatePlatformReconcileDto
    {
        [Required]
        public DateOnly ReconcileDate { get; set; }

        [Required]
        public Guid PlatformId { get; set; }

        [Required]
        public Guid PlatformAccountId { get; set; }

        [Required]
        public decimal CnySpent { get; set; }

        [Required]
        public decimal VndEquivalent { get; set; }

        [Required]
        public decimal ServiceFeeCollectedVnd { get; set; }

        [MaxLength(500)]
        public string? AlipayStatementUrl { get; set; }

        public string? Notes { get; set; }
    }
}
