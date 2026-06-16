using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LG.Shared.Constants.Common.Database;

namespace LG.Core.Domain.Finance
{
    [Table(nameof(DailyRevenueReport), Schema = DbSchemas.LGFinance)]
    public class DailyRevenueReport
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
        public decimal TotalRevenueVnd { get; set; } = 0;

        public int TotalOrdersCompleted { get; set; } = 0;

        public decimal TotalCnyPurchased { get; set; } = 0;
        public decimal TotalVndCollected { get; set; } = 0;

        public decimal? ExchangeRateAvg { get; set; }
        public decimal? ExchangeProfitLossVnd { get; set; }

        [Required]
        public DateTime GeneratedAt { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }
    }
}
