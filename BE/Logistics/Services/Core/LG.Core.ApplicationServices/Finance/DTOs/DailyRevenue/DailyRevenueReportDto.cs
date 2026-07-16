using System;

namespace LG.Core.ApplicationServices.Finance.DTOs.DailyRevenue
{
    public class DailyRevenueReportDto
    {
        public Guid Id { get; set; }
        public DateTime ReportDate { get; set; }

        public decimal ServiceFeeRevenueVnd { get; set; }
        public decimal ShipFeeRevenueVnd { get; set; }
        public decimal InspectionFeeRevenueVnd { get; set; }
        public decimal PenaltyRevenueVnd { get; set; }
        public decimal InsuranceFeeRevenueVnd { get; set; }
        public decimal EntrustmentFeeRevenueVnd { get; set; }
        
        public decimal VatFeeRevenueVnd { get; set; }
        public decimal DutyFeeRevenueVnd { get; set; }
        public decimal TotalCollectedOnBehalfVnd { get; set; }

        public decimal TotalRevenueVnd { get; set; }

        public int TotalOrdersCompleted { get; set; }

        public decimal TotalCnyPurchased { get; set; }
        public decimal TotalVndCollected { get; set; }

        public decimal? ExchangeRateAvg { get; set; }
        public decimal? ExchangeProfitLossVnd { get; set; }

        public DateTime GeneratedAt { get; set; }
        public DateTime? CreatedDate { get; set; }
    }
}
