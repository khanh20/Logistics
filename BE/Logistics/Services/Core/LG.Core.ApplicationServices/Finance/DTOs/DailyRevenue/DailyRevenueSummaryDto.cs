namespace LG.Core.ApplicationServices.Finance.DTOs.DailyRevenue
{
    public record DailyRevenueSummaryDto(
        int TotalOrders,
        decimal ServiceFeeVnd,
        decimal ShippingFeeVnd,
        decimal InspectionFeeVnd,
        decimal InsuranceFeeVnd,
        decimal ImportEntrustmentFeeVnd,
        decimal ImportVatVnd,
        decimal ImportDutyVnd
    );
}
