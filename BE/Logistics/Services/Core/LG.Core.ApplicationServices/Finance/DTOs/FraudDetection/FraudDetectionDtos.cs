using LG.Untils.EnumFinance;
using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.FraudDetection
{
    public class FraudDetectionDto
    {
        public Guid Id { get; set; }
        public Guid WalletId { get; set; }
        public Guid CustomerId { get; set; }
        public FraudTypeEnum? FraudType { get; set; }
        public decimal RiskScore { get; set; }
        public string? EvidenceJson { get; set; }
        public FraudActionEnum Action { get; set; }
        public FraudStatusEnum Status { get; set; }
        public Guid? ReviewedBy { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ResolutionNote { get; set; }
        public DateTime? CreatedDate { get; set; }
    }

    public class ReviewFraudDto
    {
        [Required]
        public FraudStatusEnum Status { get; set; }

        [MaxLength(1000)]
        public string? ResolutionNote { get; set; }
    }
}
