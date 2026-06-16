using System;
using System.ComponentModel.DataAnnotations;

namespace LG.Core.ApplicationServices.Finance.DTOs.FeeRule
{
    public class FeeRuleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public Guid? VipTierId { get; set; }
        public Guid? PlatformId { get; set; }
        public decimal ServiceFeePct { get; set; }
        public decimal IntlShipPerKgVnd { get; set; }
        public short IntlShipVolDivisor { get; set; }
        public decimal MinChargeKg { get; set; }
        public decimal InspectionFeePct { get; set; }
        public decimal InspectionMinVnd { get; set; }
        public decimal InspectionMaxVnd { get; set; }
        public decimal InsuranceBasicPct { get; set; }
        public decimal InsuranceFullPct { get; set; }
        public decimal StorageDailyPerKgVnd { get; set; }
        public bool IsActive { get; set; }
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }
    }

    public class CreateFeeRuleDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        public Guid? VipTierId { get; set; }
        public Guid? PlatformId { get; set; }

        public decimal ServiceFeePct { get; set; }
        public decimal IntlShipPerKgVnd { get; set; }
        public short IntlShipVolDivisor { get; set; } = 8000;
        public decimal MinChargeKg { get; set; } = 0.300m;
        public decimal InspectionFeePct { get; set; } = 0.005m;
        public decimal InspectionMinVnd { get; set; } = 15000;
        public decimal InspectionMaxVnd { get; set; } = 50000;
        public decimal InsuranceBasicPct { get; set; } = 0.02m;
        public decimal InsuranceFullPct { get; set; } = 0.04m;
        public decimal StorageDailyPerKgVnd { get; set; } = 5000;

        public bool IsActive { get; set; } = true;

        [Required]
        public DateOnly EffectiveFrom { get; set; }
        public DateOnly? EffectiveTo { get; set; }
    }
}
