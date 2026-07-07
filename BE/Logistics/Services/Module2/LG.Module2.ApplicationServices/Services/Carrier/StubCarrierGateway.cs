using System.Security.Cryptography;
using System.Text;
using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services.Carrier;

/// Gateway mặc định (fallback) — mô phỏng carrier chưa tích hợp API thật (GHN, Viettel Post, J&T,
/// hoặc GHTK khi chưa cấu hình Token). Phí/vận đơn sinh theo công thức tham chiếu.
public class StubCarrierGateway(ILogger<StubCarrierGateway> logger) : ICarrierGateway
{
    private const decimal BaseFeeVnd = 15_000m;
    private const decimal PerKgVnd   = 5_000m;
    private const decimal CodFeeRate = 0.01m;
    private const decimal InsuranceRate = 0.005m;

    public bool IsFallback => true;
    public bool Supports(string carrierName) => true;   // nhận mọi carrier

    public Task<CarrierQuote> QuoteAsync(CarrierShipmentContext ctx, CancellationToken ct = default)
    {
        var billableKg = Math.Max(ctx.WeightKg, 0.5m);
        var fee = BaseFeeVnd + Math.Ceiling(billableKg) * PerKgVnd;
        if (ctx.CodAmount is > 0m) fee += Math.Round(ctx.CodAmount.Value * CodFeeRate, 0);
        var insurance = Math.Round(ctx.ValueVnd * InsuranceRate, 0);

        logger.LogInformation("[CARRIER-STUB] {Carrier} quote: {Weight}kg → {Fee} VND",
            ctx.CarrierName, ctx.WeightKg, fee);
        return Task.FromResult(new CarrierQuote(Math.Round(fee, 0), insurance));
    }

    public Task<CarrierWaybillResult> CreateWaybillAsync(CarrierShipmentContext ctx, CancellationToken ct = default)
    {
        var prefix = ctx.CarrierName.ToUpperInvariant() switch
        {
            "GHTK"         => "GHTK",
            "GHN"          => "GHN",
            "VIETTEL POST" => "VTP",
            "J&T EXPRESS"  => "JT",
            _              => "DOM",
        };
        var trackingNo = $"{prefix}{DateTime.UtcNow:yyyyMMdd}{Random.Shared.Next(0, 1_000_000):D6}";
        logger.LogInformation("[CARRIER-STUB] {Carrier} created waybill {TrackingNo}", ctx.CarrierName, trackingNo);
        return Task.FromResult(new CarrierWaybillResult(trackingNo, null, null));
    }

    public Task<bool> CancelWaybillAsync(string trackingNo, CancellationToken ct = default)
    {
        logger.LogInformation("[CARRIER-STUB] cancelled waybill {TrackingNo}", trackingNo);
        return Task.FromResult(true);
    }

    public Task<CarrierWaybillStatus?> GetWaybillStatusAsync(string trackingNo, CancellationToken ct = default)
    {
        logger.LogInformation("[CARRIER-STUB] trace {TrackingNo}: không có API thật, bỏ qua đối soát", trackingNo);
        return Task.FromResult<CarrierWaybillStatus?>(null);
    }

    public DomesticWaybillStatus MapStatus(string rawStatus)
    {
        var s = rawStatus.Trim().ToLowerInvariant().Replace("_", "").Replace("-", "").Replace(" ", "");
        return s switch
        {
            "created" or "ready" or "waiting"                      => DomesticWaybillStatus.Created,
            "pickedup" or "picked" or "pickup" or "collected"      => DomesticWaybillStatus.PickedUp,
            "intransit" or "transit" or "transporting" or "moving" => DomesticWaybillStatus.InTransit,
            "outfordelivery" or "delivering" or "ondelivery"       => DomesticWaybillStatus.OutForDelivery,
            "delivered" or "success" or "completed"                => DomesticWaybillStatus.Delivered,
            "failed" or "deliveryfailed" or "unsuccessful"         => DomesticWaybillStatus.DeliveryFailed,
            "returned" or "returning" or "return"                  => DomesticWaybillStatus.Returned,
            "cancelled" or "canceled"                              => DomesticWaybillStatus.Cancelled,
            _ => Enum.TryParse<DomesticWaybillStatus>(rawStatus, ignoreCase: true, out var parsed)
                    ? parsed
                    : DomesticWaybillStatus.InTransit,
        };
    }

    public bool VerifySignature(string? secret, CarrierWebhookRequest payload)
    {
        if (string.IsNullOrEmpty(secret)) return true;
        if (string.IsNullOrEmpty(payload.Signature)) return false;

        var canonical = $"{payload.TrackingNo}|{payload.Status}|{payload.FeeVnd}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical)));
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(hash),
            Encoding.UTF8.GetBytes(payload.Signature.Trim().ToUpperInvariant()));
    }
}
