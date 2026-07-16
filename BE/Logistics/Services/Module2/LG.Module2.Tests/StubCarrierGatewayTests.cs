using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.Services.Carrier;
using LG.Module2.Domain.Entities;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// Công thức tính phí + map status của gateway fallback (stub).
public class StubCarrierGatewayTests
{
    private static StubCarrierGateway NewGateway() => new(Mock.Of<ILogger<StubCarrierGateway>>());

    private static CarrierShipmentContext Ctx(decimal weightKg, decimal valueVnd = 0m, decimal? cod = null) =>
        new("GHTK", Guid.NewGuid(), "code", "Nguyễn Văn A", "0900000000",
            "Hà Nội", "Cầu Giấy", "Dịch Vọng", "1 Trần Thái Tông",
            weightKg, valueVnd, cod, new List<CarrierItem>());

    [Fact]
    public async Task Quote_TinhTheoBacThang_LamTronKgLenTren()
    {
        // 2.4kg → ceil(2.4) = 3kg × 5.000 + 15.000 base = 30.000
        var quote = await NewGateway().QuoteAsync(Ctx(2.4m));
        Assert.Equal(30_000m, quote.ShipFeeVnd);
    }

    [Fact]
    public async Task Quote_CanNangToiThieu_NuaKg()
    {
        // 0.2kg → billable 0.5 → ceil = 1kg × 5.000 + 15.000 = 20.000
        var quote = await NewGateway().QuoteAsync(Ctx(0.2m));
        Assert.Equal(20_000m, quote.ShipFeeVnd);
    }

    [Fact]
    public async Task Quote_CongPhiCod_VaBaoHiem()
    {
        // 1kg = 20.000 + COD 100.000×1% = 1.000 → 21.000; bảo hiểm 2.000.000×0,5% = 10.000
        var quote = await NewGateway().QuoteAsync(Ctx(1m, valueVnd: 2_000_000m, cod: 100_000m));
        Assert.Equal(21_000m, quote.ShipFeeVnd);
        Assert.Equal(10_000m, quote.InsuranceFeeVnd);
    }

    [Theory]
    [InlineData("delivered",        DomesticWaybillStatus.Delivered)]
    [InlineData("out_for_delivery", DomesticWaybillStatus.OutForDelivery)]
    [InlineData("picked-up",        DomesticWaybillStatus.PickedUp)]
    [InlineData("IN TRANSIT",       DomesticWaybillStatus.InTransit)]
    [InlineData("failed",           DomesticWaybillStatus.DeliveryFailed)]
    [InlineData("returned",         DomesticWaybillStatus.Returned)]
    [InlineData("cancelled",        DomesticWaybillStatus.Cancelled)]
    [InlineData("Delivered",        DomesticWaybillStatus.Delivered)]   // parse enum trực tiếp
    public void MapStatus_ChuanHoaNhieuDangViet(string raw, DomesticWaybillStatus expected) =>
        Assert.Equal(expected, NewGateway().MapStatus(raw));

    [Fact]
    public async Task CreateWaybill_PrefixTheoCarrier()
    {
        var result = await NewGateway().CreateWaybillAsync(Ctx(1m));
        Assert.StartsWith("GHTK", result.TrackingNo);
    }

    [Fact]
    public async Task Cancel_VaTrace_HoatDongNhuStub()
    {
        var gw = NewGateway();
        Assert.True(await gw.CancelWaybillAsync("GHTK123"));
        Assert.True(await gw.CancelByPartnerCodeAsync("abc"));
        Assert.Null(await gw.GetWaybillStatusAsync("GHTK123"));   // không có API thật → null
    }
}
