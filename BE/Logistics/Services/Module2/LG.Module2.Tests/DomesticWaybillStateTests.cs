using LG.Module2.Domain.Entities;

namespace LG.Module2.Tests;

/// B5 — guard chống webhook trùng lặp / trạng thái đi lùi trên DomesticWaybill.
public class DomesticWaybillStateTests
{
    private static DomesticWaybill NewWaybill(DomesticWaybillStatus? advanceTo = null)
    {
        var wb = DomesticWaybill.Create(Guid.NewGuid(), Guid.NewGuid(), "GHTK-TEST-001");
        if (advanceTo.HasValue)
            Assert.True(wb.UpdateFromWebhook(advanceTo.Value));
        return wb;
    }

    [Theory]
    [InlineData(DomesticWaybillStatus.PickedUp)]
    [InlineData(DomesticWaybillStatus.InTransit)]
    [InlineData(DomesticWaybillStatus.OutForDelivery)]
    [InlineData(DomesticWaybillStatus.Delivered)]
    [InlineData(DomesticWaybillStatus.DeliveryFailed)]
    [InlineData(DomesticWaybillStatus.Cancelled)]
    public void TienLen_TuCreated_DuocChapNhan(DomesticWaybillStatus next)
    {
        var wb = NewWaybill();
        Assert.True(wb.UpdateFromWebhook(next));
        Assert.Equal(next, wb.Status);
    }

    [Fact]
    public void TrungTrangThai_BiBoQua()
    {
        var wb = NewWaybill(DomesticWaybillStatus.InTransit);
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.InTransit));
    }

    [Fact]
    public void DiLui_BiBoQua()
    {
        var wb = NewWaybill(DomesticWaybillStatus.OutForDelivery);
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.PickedUp));
        Assert.Equal(DomesticWaybillStatus.OutForDelivery, wb.Status);
    }

    [Theory]
    [InlineData(DomesticWaybillStatus.Delivered)]
    [InlineData(DomesticWaybillStatus.Returned)]
    [InlineData(DomesticWaybillStatus.Cancelled)]
    public void TrangThaiKetThuc_KhoaMoiCapNhat(DomesticWaybillStatus terminal)
    {
        var wb = NewWaybill(terminal);
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.InTransit));
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.Delivered));
        Assert.Equal(terminal, wb.Status);
    }

    [Fact]
    public void GiaoThatBai_LapLai_TinhMoiLanMotLanThu()
    {
        var wb = NewWaybill(DomesticWaybillStatus.OutForDelivery);

        Assert.True(wb.UpdateFromWebhook(DomesticWaybillStatus.DeliveryFailed, failedReason: "Khách không nghe máy"));
        Assert.Equal(1, wb.DeliveryAttemptCount);

        // Webhook failed lần nữa = lần thử giao mới, không phải duplicate
        Assert.True(wb.UpdateFromWebhook(DomesticWaybillStatus.DeliveryFailed));
        Assert.Equal(2, wb.DeliveryAttemptCount);
    }

    [Fact]
    public void GiaoThatBai_DuocQuayLaiGiaoTiep()
    {
        var wb = NewWaybill(DomesticWaybillStatus.OutForDelivery);
        Assert.True(wb.UpdateFromWebhook(DomesticWaybillStatus.DeliveryFailed));

        // Hoãn giao → giao lại: quay về OutForDelivery hợp lệ
        Assert.True(wb.UpdateFromWebhook(DomesticWaybillStatus.OutForDelivery));
        Assert.True(wb.UpdateFromWebhook(DomesticWaybillStatus.Delivered));
    }

    [Fact]
    public void GiaoThatBai_KhongDuocVeCreatedHayPickedUp()
    {
        var wb = NewWaybill(DomesticWaybillStatus.DeliveryFailed);
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.Created));
        Assert.False(wb.UpdateFromWebhook(DomesticWaybillStatus.PickedUp));
    }

    [Fact]
    public void SetCarrierFee_KhongDiQuaGuard()
    {
        var wb = NewWaybill();
        wb.SetCarrierFee(25_000m);
        Assert.Equal(25_000m, wb.CarrierFeeVnd);
        Assert.Equal(DomesticWaybillStatus.Created, wb.Status);
    }
}
