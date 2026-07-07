using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.ApplicationServices.Services.Carrier;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// UC-2.09 — luồng webhook: cập nhật waybill, package, notify; chống trùng lặp.
public class TrackingServiceWebhookTests
{
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly DomesticCarrier _carrier;
    private readonly DeliveryRequest _request;
    private readonly DomesticWaybill _waybill;
    private readonly Package _package;
    private readonly Mock<INotificationService> _notify = new();
    private readonly TrackingService _service;

    public TrackingServiceWebhookTests()
    {
        _carrier = DomesticCarrier.Create("GHTK", "https://stub", 20m, 20_000_000m);

        _package = Package.Create(_customerId, Guid.NewGuid(), "PKG001");
        _package.TransitionTo(PackageStatus.InCnWarehouse);
        _package.TransitionTo(PackageStatus.InSack);
        _package.TransitionTo(PackageStatus.InTransit);
        _package.TransitionTo(PackageStatus.InVnWarehouse);
        _package.TransitionTo(PackageStatus.Dispatched);

        _request = DeliveryRequest.Create(_customerId, Guid.NewGuid());
        _request.Packages.Add(DeliveryPackage.Create(_request.Id, _package.Id));
        _request.MarkShipping();

        _waybill = DomesticWaybill.Create(_request.Id, _carrier.Id, "GHTK-TEST-01");

        var waybillRepo = new Mock<IDomesticWaybillRepository>();
        waybillRepo.Setup(r => r.GetByTrackingNoAsync("GHTK-TEST-01", It.IsAny<CancellationToken>()))
                   .ReturnsAsync(_waybill);

        var carrierRepo = new Mock<IDomesticCarrierRepository>();
        carrierRepo.Setup(r => r.GetByIdAsync(_carrier.Id, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(_carrier);

        var deliveryRepo = new Mock<IDeliveryRequestRepository>();
        deliveryRepo.Setup(r => r.GetByIdAsync(_request.Id, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(_request);

        var packageRepo = new Mock<IPackageRepository>();
        packageRepo.Setup(r => r.GetByIdAsync(_package.Id, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(_package);

        var resolver = new Mock<ICarrierGatewayResolver>();
        resolver.Setup(r => r.Resolve(It.IsAny<string>()))
                .Returns(new StubCarrierGateway(Mock.Of<ILogger<StubCarrierGateway>>()));

        var uow = new Mock<IModule2UnitOfWork>();
        uow.Setup(u => u.ExecuteInTransactionAsync(
                It.IsAny<Func<CancellationToken, Task<WebhookResult>>>(), It.IsAny<CancellationToken>()))
           .Returns<Func<CancellationToken, Task<WebhookResult>>, CancellationToken>((f, ct) => f(ct));

        _service = new TrackingService(
            waybillRepo.Object, carrierRepo.Object, deliveryRepo.Object, packageRepo.Object,
            Mock.Of<ITrackingEventRepository>(), resolver.Object, _notify.Object,
            uow.Object, Mock.Of<ILogger<TrackingService>>());
    }

    private Task<WebhookResult> Send(string rawStatus, string? reason = null) =>
        _service.ProcessWebhookAsync("GHTK", new CarrierWebhookRequest("GHTK-TEST-01", rawStatus, Reason: reason));

    [Fact]
    public async Task Delivered_CapNhatWaybillPackageRequest_VaNotify()
    {
        var result = await Send("delivered");

        Assert.True(result.Processed);
        Assert.Equal(1, result.AffectedPackages);
        Assert.Equal(DomesticWaybillStatus.Delivered, _waybill.Status);
        Assert.Equal(PackageStatus.Delivered, _package.Status);
        Assert.Equal(DeliveryRequestStatus.Delivered, _request.Status);
        _notify.Verify(n => n.SendDeliveredAsync(_customerId, "GHTK-TEST-01", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task WebhookTrungLap_LanHaiBiBoQua_KhongNotifyLai()
    {
        await Send("delivered");
        var second = await Send("delivered");

        Assert.False(second.Processed);
        Assert.Equal(0, second.AffectedPackages);
        _notify.Verify(n => n.SendDeliveredAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task WebhookDenTre_TrangThaiDiLui_BiBoQua()
    {
        await Send("delivered");
        var late = await Send("in_transit");

        Assert.False(late.Processed);
        Assert.Equal(DomesticWaybillStatus.Delivered, _waybill.Status);
        Assert.Equal(PackageStatus.Delivered, _package.Status);
    }

    [Fact]
    public async Task GiaoThatBai_QuaHaiLan_AlertCskh_VaMarkFailed()
    {
        await Send("failed", "lần 1");
        await Send("failed", "lần 2");
        _notify.Verify(n => n.SendDeliveryFailedAlertAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);

        await Send("failed", "lần 3");

        Assert.Equal(3, _waybill.DeliveryAttemptCount);
        Assert.Equal(DeliveryRequestStatus.Failed, _request.Status);
        _notify.Verify(n => n.SendDeliveryFailedAlertAsync("GHTK-TEST-01", 3, "lần 3",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Returned_PackageVeTrangThaiReturned()
    {
        var result = await Send("returned");

        Assert.True(result.Processed);
        Assert.Equal(PackageStatus.Returned, _package.Status);
    }

    [Fact]
    public async Task KhongTimThayWaybill_NemNotFound()
    {
        await Assert.ThrowsAsync<DomesticWaybillNotFoundException>(() =>
            _service.ProcessWebhookAsync("GHTK", new CarrierWebhookRequest("KHONG-TON-TAI", "delivered")));
    }
}
