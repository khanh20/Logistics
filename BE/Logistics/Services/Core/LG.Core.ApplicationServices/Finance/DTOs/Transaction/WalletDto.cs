using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.Transaction
{
    public class WalletDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string Currency { get; set; } = "VND";
        public decimal AvailableBalance { get; set; }
        public decimal FrozenBalance { get; set; }
        public decimal TotalBalance { get; set; }
        public bool IsFrozen { get; set; }
        public string? FrozenReason { get; set; }
    }
}
