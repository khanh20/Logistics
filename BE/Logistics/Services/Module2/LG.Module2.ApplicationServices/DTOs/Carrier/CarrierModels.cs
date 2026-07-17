namespace LG.Module2.ApplicationServices.DTOs.Carrier;

/// Thông tin 1 lô giao hàng để gửi sang carrier (GHTK/GHN...).
public record CarrierShipmentContext(
    string CarrierName,
    Guid   DeliveryRequestId,
    string PartnerOrderCode,     // mã đơn phía mình (GHTK field `id`)
    string RecipientName,
    string RecipientTel,
    string Province,
    string District,
    string Ward,
    string Address,
    decimal WeightKg,
    decimal ValueVnd,
    decimal? CodAmount,
    IReadOnlyList<CarrierItem> Items
);

public record CarrierItem(string Name, decimal WeightKg, int Quantity);

public record CarrierQuote(decimal ShipFeeVnd, decimal InsuranceFeeVnd);

public record CarrierWaybillResult(string TrackingNo, decimal? FeeVnd, string? EstimatedDeliverTime);

/// Trạng thái vận đơn tra cứu chủ động từ carrier (đối soát khi webhook miss).
public record CarrierWaybillStatus(string RawStatus, string? Reason = null, decimal? FeeVnd = null);
