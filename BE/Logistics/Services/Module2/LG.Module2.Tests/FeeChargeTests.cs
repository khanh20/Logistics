using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// UC-2.07 — thu cước quốc tế thật: trừ ví, chống thu 2 lần, compensation khi commit fail.
public class FeeChargeTests
{
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly Package _package;
    private readonly Mock<IWalletService> _wallet = new();
    private readonly Mock<INotificationService> _notify = new();
    private readonly Mock<IPackageRepository> _pkgRepo = new();
    private readonly FeeCalculationService _service;

    public FeeChargeTests()
    {
        _package = Package.Create(_customerId, Guid.NewGuid(), "PKG-FEE-01");
        _package.EnableInsurance(InsuranceLevel.Full);
        _package.RecordMeasurement(5m, 20m, 20m, 20m);   // charged = max(5, 8000/8000=1, 0.3) = 5kg

        _pkgRepo.Setup(r => r.GetByIdAsync(_package.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(_package);

        var uow = new Mock<IModule2UnitOfWork>();
        uow.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<CancellationToken, Task>>(), It.IsAny<CancellationToken>()))
           .Returns<Func<CancellationToken, Task>, CancellationToken>((f, ct) => f(ct));

        _service = new FeeCalculationService(_pkgRepo.Object, _wallet.Object, _notify.Object,
            uow.Object, Mock.Of<ILogger<FeeCalculationService>>());
    }

    private void CalculateFee() =>
        _package.CalculateInternationalFee(ratePerKgVnd: 30_000m, insuranceRate: 0.02m, declaredValueVnd: 1_000_000m);
    // ship = 5 × 30.000 = 150.000; insurance = 1.000.000 × 2% = 20.000 → total 170.000

    [Fact]
    public async Task Charge_TruViDungTong_DanhDauDaThu_Notify()
    {
        CalculateFee();
        var res = await _service.ChargeAsync(_package.Id);

        _wallet.Verify(w => w.DeductAsync(_customerId, 170_000m, "PackageIntlFee", _package.Id,
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.NotNull(_package.FeePaidAt);
        Assert.NotNull(res.PaidAt);
        _notify.Verify(n => n.SendIntlFeeChargedAsync(_customerId, "PKG-FEE-01", 170_000m, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Charge_ChuaTinhCuoc_Nem422()
    {
        // chưa gọi CalculateFee
        await Assert.ThrowsAsync<FeeNotCalculatedException>(() => _service.ChargeAsync(_package.Id));
        _wallet.Verify(w => w.DeductAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Charge_LanHai_Nem409_KhongTruThemLan()
    {
        CalculateFee();
        await _service.ChargeAsync(_package.Id);

        await Assert.ThrowsAsync<FeeAlreadyPaidException>(() => _service.ChargeAsync(_package.Id));
        _wallet.Verify(w => w.DeductAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);   // vẫn chỉ 1 lần
    }

    [Fact]
    public async Task Charge_ThieuSoDu_KhongDanhDauThu()
    {
        CalculateFee();
        _wallet.Setup(w => w.DeductAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new WalletOperationFailedException("Số dư không đủ."));

        await Assert.ThrowsAsync<WalletOperationFailedException>(() => _service.ChargeAsync(_package.Id));
        Assert.Null(_package.FeePaidAt);
    }

    [Fact]
    public async Task Charge_CommitFail_HoanLai_KhongDanhDau()
    {
        CalculateFee();
        var uow = new Mock<IModule2UnitOfWork>();
        uow.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<CancellationToken, Task>>(), It.IsAny<CancellationToken>()))
           .ThrowsAsync(new InvalidOperationException("DB down"));
        var svc = new FeeCalculationService(_pkgRepo.Object, _wallet.Object, _notify.Object,
            uow.Object, Mock.Of<ILogger<FeeCalculationService>>());

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.ChargeAsync(_package.Id));

        // đã trừ 170k rồi hoàn lại 170k (compensation) — khách net = 0, kiện chưa đánh dấu
        _wallet.Verify(w => w.DeductAsync(_customerId, 170_000m, "PackageIntlFee", _package.Id,
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        _wallet.Verify(w => w.RefundAsync(_customerId, 170_000m, "PackageIntlFee", _package.Id,
            It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Once);
        Assert.Null(_package.FeePaidAt);
    }

    [Fact]
    public async Task Calculate_SauKhiDaThu_Nem409()
    {
        CalculateFee();
        await _service.ChargeAsync(_package.Id);

        await Assert.ThrowsAsync<FeeAlreadyPaidException>(() =>
            _service.CalculateAsync(_package.Id, new CalculateFeeRequest(40_000m)));
    }
}
