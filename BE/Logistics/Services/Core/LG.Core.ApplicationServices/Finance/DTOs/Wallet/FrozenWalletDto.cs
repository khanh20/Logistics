using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.Wallet
{
    public class FrozenWalletDto
    {
        public Guid WalletId { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public decimal AvailableBalance { get; set; }
        public decimal FrozenBalance { get; set; }
        public decimal RiskScore { get; set; }
        public bool IsFrozen { get; set; }
        public bool IgnoreFraudDetection { get; set; }
        public string Reason { get; set; } = string.Empty;
        public DateTime FrozenDate { get; set; }
    }
}
