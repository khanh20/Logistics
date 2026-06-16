using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.VipTier
{
    public class VipTierDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public short Level { get; set; }
        public decimal MinSpendVnd { get; set; }
        public decimal ServiceFeeDiscountPct { get; set; }
        public bool FreeInspection { get; set; }
        public short FreeStorageDays { get; set; }
        public bool PrioritySupport { get; set; }
        public decimal? DepositPctOverride { get; set; }
        public decimal CashbackPct { get; set; }
        public string? ColorHex { get; set; }
    }

    public class CreateVipTierDto
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; }

        [Required]
        public short Level { get; set; }

        [Required]
        public decimal MinSpendVnd { get; set; }

        public decimal ServiceFeeDiscountPct { get; set; } = 0;
        public bool FreeInspection { get; set; } = false;
        public short FreeStorageDays { get; set; } = 7;
        public bool PrioritySupport { get; set; } = false;
        public decimal? DepositPctOverride { get; set; }
        public decimal CashbackPct { get; set; } = 0;

        [MaxLength(6)]
        public string? ColorHex { get; set; }
    }
}
