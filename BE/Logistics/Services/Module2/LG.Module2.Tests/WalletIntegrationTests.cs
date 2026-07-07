using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// Tích hợp ví Core Finance trong luồng giao nội địa: trừ ví khi tạo,
/// hoàn ví khi huỷ / khi tạo fail giữa chừng (compensation).
public class WalletIntegrationTests
{
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly DomesticCarrier _carrier = DomesticCarrier.Create("GHTK", "https://x", 30m, 20_000_000m);
    private readonly Package _package;
    private readonly Mock<IWalletService> _wallet = new();
    private readonly Mock<ICustomerAddressService> _addressBook = new();
    private readonly Mock<ICarrierGateway> _gateway = new();
    private readonly Mock<IDeliveryRequestRepository> _deliveryRepo = new();

    public WalletIntegrationTests()
    {
        _package = Package.Create(_customerId, Guid.NewGuid(), "PKG001");
        _package.TransitionTo(PackageStatus.InCnWarehouse);
        _package.TransitionTo(PackageStatus.InSack);
        _package.TransitionTo(PackageStatus.InTransit);
        _package.TransitionTo(PackageStatus.InVnWarehouse);

        _gateway.Setup(g => g.QuoteAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new CarrierQuote(30_000m, 0m));
        _gateway.Setup(g => g.CreateWaybillAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new CarrierWaybillResult("GHTK-TEST-99", 28_000m, null));
        _gateway.Setup(g => g.CancelByPartnerCodeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
        _gateway.Setup(g => g.CancelWaybillAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

        // Mặc định: địa chỉ tồn tại trong sổ của khách
        _addressBook.Setup(a => a.GetMyAddressAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((Guid id, CancellationToken _) =>
                        new CustomerAddressInfo(id, "Trần Thị B (sổ)", "0911111111", "5 Duy Tân"));
    }

    private DeliveryService NewService()
    {
        var carrierRepo = new Mock<IDomesticCarrierRepository>();
        carrierRepo.Setup(r => r.GetByIdAsync(_carrier.Id, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(_carrier);

        var packageRepo = new Mock<IPackageRepository>();
        packageRepo.Setup(r => r.GetByIdAsync(_package.Id, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(_package);

        var resolver = new Mock<ICarrierGatewayResolver>();
        resolver.Setup(r => r.Resolve(It.IsAny<string>())).Returns(_gateway.Object);

        var uow = new Mock<IModule2UnitOfWork>();
        uow.Setup(u => u.ExecuteInTransactionAsync(
                It.IsAny<Func<CancellationToken, Task>>(), It.IsAny<CancellationToken>()))
           .Returns<Func<CancellationToken, Task>, CancellationToken>((f, ct) => f(ct));
        uow.Setup(u => u.ExecuteInTransactionAsync(
                It.IsAny<Func<CancellationToken, Task<DeliveryRequestResponse>>>(), It.IsAny<CancellationToken>()))
           .Returns<Func<CancellationToken, Task<DeliveryRequestResponse>>, CancellationToken>((f, ct) => f(ct));

        return new DeliveryService(_deliveryRepo.Object, carrierRepo.Object,
            Mock.Of<IDomesticWaybillRepository>(), packageRepo.Object,
            Mock.Of<ITrackingEventRepository>(), resolver.Object, _wallet.Object,
            _addressBook.Object, Mock.Of<INotificationService>(), uow.Object,
            Mock.Of<ILogger<DeliveryService>>());
    }

    private CreateDeliveryRequest NewRequest() => new(
        PackageIds: new List<Guid> { _package.Id },
        CarrierId: _carrier.Id,
        DeliveryAddressId: Guid.NewGuid(),
        RecipientName: "Nguyễn Văn A", RecipientTel: "0900000000",
        Province: "Hà Nội", District: "Cầu Giấy", Ward: "Dịch Vọng", Address: "1 Trần Thái Tông");

    [Fact]
    public async Task TaoYeuCau_TruViDungPhiQuote_TruocKhiTaoVanDon()
    {
        var result = await NewService().CreateAsync(_customerId, NewRequest());

        _wallet.Verify(w => w.DeductAsync(_customerId, 30_000m, "DeliveryRequest", It.IsAny<Guid>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _wallet.Verify(w => w.RefundAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Equal(30_000m, result.ShipFeeVnd);
    }

    [Fact]
    public async Task TruViThatBai_KhongTaoVanDon_KhongHoan_RequestBiHuy()
    {
        _wallet.Setup(w => w.DeductAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new WalletOperationFailedException("Số dư không đủ."));

        await Assert.ThrowsAsync<WalletOperationFailedException>(() =>
            NewService().CreateAsync(_customerId, NewRequest()));

        _gateway.Verify(g => g.CreateWaybillAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()), Times.Never);
        _wallet.Verify(w => w.RefundAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task TaoVanDonThatBai_HoanViDaTru_HuyDonCarrier()
    {
        _gateway.Setup(g => g.CreateWaybillAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("GHTK tạo đơn thất bại"));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            NewService().CreateAsync(_customerId, NewRequest()));

        _wallet.Verify(w => w.RefundAsync(_customerId, 30_000m, "DeliveryRequest", It.IsAny<Guid>(),
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _gateway.Verify(g => g.CancelByPartnerCodeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task KhachHuyYeuCau_HoanPhiShip()
    {
        var request = DeliveryRequest.Create(_customerId, Guid.NewGuid());
        request.SetShipFee(30_000m, _carrier.Id);
        _deliveryRepo.Setup(r => r.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(request);

        await NewService().CancelAsync(request.Id, _customerId);

        Assert.Equal(DeliveryRequestStatus.Cancelled, request.Status);
        _wallet.Verify(w => w.RefundAsync(_customerId, 30_000m, "DeliveryRequest", request.Id,
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── Reconcile sổ địa chỉ ──────────────────────────────────────────────────────
    [Fact]
    public async Task DiaChiKhongCoTrongSo_Tra404_KhongTruVi_KhongTaoDon()
    {
        _addressBook.Setup(a => a.GetMyAddressAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync((CustomerAddressInfo?)null);

        await Assert.ThrowsAsync<DeliveryAddressNotFoundException>(() =>
            NewService().CreateAsync(_customerId, NewRequest()));

        _wallet.Verify(w => w.DeductAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _gateway.Verify(g => g.CreateWaybillAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ThongTinNguoiNhan_LayTuSoDiaChi_LamChuan()
    {
        CarrierShipmentContext? sent = null;
        _gateway.Setup(g => g.CreateWaybillAsync(It.IsAny<CarrierShipmentContext>(), It.IsAny<CancellationToken>()))
                .Callback<CarrierShipmentContext, CancellationToken>((c, _) => sent = c)
                .ReturnsAsync(new CarrierWaybillResult("GHTK-TEST-99", null, null));

        await NewService().CreateAsync(_customerId, NewRequest());

        Assert.NotNull(sent);
        Assert.Equal("Trần Thị B (sổ)", sent!.RecipientName);   // sổ thắng body
        Assert.Equal("0911111111", sent.RecipientTel);
        Assert.Equal("5 Duy Tân", sent.Address);
        Assert.Equal("Hà Nội", sent.Province);                   // tỉnh/huyện/xã vẫn theo body
    }

    [Fact]
    public async Task HoanViLoi_KhongLamHongViecHuy()
    {
        var request = DeliveryRequest.Create(_customerId, Guid.NewGuid());
        request.SetShipFee(30_000m, _carrier.Id);
        _deliveryRepo.Setup(r => r.GetByIdAsync(request.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(request);
        _wallet.Setup(w => w.RefundAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new WalletOperationFailedException("Core sập"));

        // Refund fail chỉ log để đối soát tay — việc huỷ vẫn thành công
        var result = await NewService().CancelAsync(request.Id, _customerId);
        Assert.Equal(DeliveryRequestStatus.Cancelled.ToString(), result.Status);
    }
}
