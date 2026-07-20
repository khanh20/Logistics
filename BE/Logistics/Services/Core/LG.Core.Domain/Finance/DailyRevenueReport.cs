using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LG.Shared.Constants.Common.Database;
using LG.EntitiesBase;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(DailyRevenueReport), Schema = DbSchemas.LGFinance)]
    public class DailyRevenueReport : IFullAudited
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public DateTime ReportDate { get; set; } 

        public decimal ServiceFeeRevenueVnd { get; set; } = 0;
        public decimal ShipFeeRevenueVnd { get; set; } = 0;
        public decimal InspectionFeeRevenueVnd { get; set; } = 0;
        public decimal PenaltyRevenueVnd { get; set; } = 0;
        public decimal InsuranceFeeRevenueVnd { get; set; } = 0;
        public decimal EntrustmentFeeRevenueVnd { get; set; } = 0;
        
        public decimal VatFeeRevenueVnd { get; set; } = 0;
        public decimal DutyFeeRevenueVnd { get; set; } = 0;
        public decimal TotalCollectedOnBehalfVnd { get; set; } = 0;

        public decimal TotalRevenueVnd { get; set; } = 0;

        public int TotalOrdersCompleted { get; set; } = 0;

        public decimal TotalCnyPurchased { get; set; } = 0;
        public decimal TotalVndCollected { get; set; } = 0;

        public decimal? ExchangeRateAvg { get; set; }
        public decimal? ExchangeProfitLossVnd { get; set; }

        [Required]
        public DateTime GeneratedAt { get; set; }

        public DateTime? DeletedDate { get; set; }
        public bool Deleted { get; set; }
        public Guid? DeletedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
        public Guid? ModifiedBy { get; set; }
    }
}
