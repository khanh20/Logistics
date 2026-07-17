using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Services.Carrier;
using LG.Module2.Domain.Entities;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// Map status_id GHTK → enum nội bộ + xác thực webhook token.
public class GhtkCarrierGatewayTests
{
    private static GhtkCarrierGateway NewGateway(GhtkOptions? options = null) =>
        new(new HttpClient { BaseAddress = new Uri("https://localhost") },
            options ?? new GhtkOptions(),
            Mock.Of<ILogger<GhtkCarrierGateway>>());

    [Theory]
    [InlineData("-1", DomesticWaybillStatus.Cancelled)]
    [InlineData("1",  DomesticWaybillStatus.Created)]
    [InlineData("2",  DomesticWaybillStatus.Created)]
    [InlineData("3",  DomesticWaybillStatus.PickedUp)]
    [InlineData("12", DomesticWaybillStatus.PickedUp)]
    [InlineData("4",  DomesticWaybillStatus.OutForDelivery)]
    [InlineData("5",  DomesticWaybillStatus.Delivered)]
    [InlineData("6",  DomesticWaybillStatus.Delivered)]
    [InlineData("9",  DomesticWaybillStatus.DeliveryFailed)]
    [InlineData("7",  DomesticWaybillStatus.InTransit)]
    [InlineData("8",  DomesticWaybillStatus.InTransit)]
    [InlineData("10", DomesticWaybillStatus.InTransit)]
    [InlineData("11", DomesticWaybillStatus.Returned)]
    [InlineData("13", DomesticWaybillStatus.Returned)]
    [InlineData("20", DomesticWaybillStatus.Returned)]
    [InlineData("21", DomesticWaybillStatus.Returned)]
    public void MapStatus_TheoBangMaGhtk(string raw, DomesticWaybillStatus expected) =>
        Assert.Equal(expected, NewGateway().MapStatus(raw));

    [Fact]
    public void MapStatus_MaLa_MacDinhInTransit() =>
        Assert.Equal(DomesticWaybillStatus.InTransit, NewGateway().MapStatus("999"));

    [Fact]
    public void MapStatus_CoKhoangTrang_VanMapDung() =>
        Assert.Equal(DomesticWaybillStatus.Delivered, NewGateway().MapStatus(" 5 "));

    // ── VerifySignature: so token webhook ─────────────────────────────────────────
    private static CarrierWebhookRequest Payload(string? signature) =>
        new("GHTK123", "5", Signature: signature);

    [Fact]
    public void VerifySignature_DungToken_Pass()
    {
        var gw = NewGateway(new GhtkOptions { WebhookToken = "my-secret" });
        Assert.True(gw.VerifySignature(null, Payload("my-secret")));
    }

    [Fact]
    public void VerifySignature_SaiToken_Fail()
    {
        var gw = NewGateway(new GhtkOptions { WebhookToken = "my-secret" });
        Assert.False(gw.VerifySignature(null, Payload("wrong")));
        Assert.False(gw.VerifySignature(null, Payload(null)));
    }

    [Fact]
    public void VerifySignature_SecretTuDb_UuTienHonConfig()
    {
        var gw = NewGateway(new GhtkOptions { WebhookToken = "config-token" });
        Assert.True(gw.VerifySignature("db-secret", Payload("db-secret")));
        Assert.False(gw.VerifySignature("db-secret", Payload("config-token")));
    }

    [Fact]
    public void VerifySignature_ChuaCauHinh_BoQuaXacThuc()
    {
        var gw = NewGateway(new GhtkOptions());
        Assert.True(gw.VerifySignature(null, Payload(null)));
    }

    [Fact]
    public void Enabled_ChiCanToken()
    {
        Assert.True(new GhtkOptions { Token = "abc" }.Enabled);
        Assert.False(new GhtkOptions().Enabled);
        Assert.False(new GhtkOptions { ClientSource = "S123" }.Enabled);
    }
}
