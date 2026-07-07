using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

/// Ownership guard — khách không xem được tracking/claim của người khác (trả 404, không lộ tồn tại).
public class OwnershipGuardTests
{
    private readonly Guid _owner = Guid.NewGuid();
    private readonly Guid _otherCustomer = Guid.NewGuid();

    // ── PackageService.GetTrackingForCustomerAsync ────────────────────────────────
    private PackageService NewPackageService(Package? package)
    {
        var packageRepo = new Mock<IPackageRepository>();
        packageRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(package);

        var trackingRepo = new Mock<ITrackingEventRepository>();
        trackingRepo.Setup(r => r.GetByPackageAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new List<TrackingEvent>());

        return new PackageService(packageRepo.Object, Mock.Of<IWarehouseZoneRepository>(),
            trackingRepo.Object, Mock.Of<IBarcodeService>(), Mock.Of<IModule2UnitOfWork>(),
            Mock.Of<ILogger<PackageService>>());
    }

    [Fact]
    public async Task Tracking_ChinhChu_XemDuoc()
    {
        var pkg = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var svc = NewPackageService(pkg);
        var events = await svc.GetTrackingForCustomerAsync(_owner, pkg.Id);
        Assert.NotNull(events);
    }

    [Fact]
    public async Task Tracking_KhacChu_Tra404()
    {
        var pkg = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var svc = NewPackageService(pkg);
        await Assert.ThrowsAsync<PackageNotFoundException>(() =>
            svc.GetTrackingForCustomerAsync(_otherCustomer, pkg.Id));
    }

    // ── ClaimService — missing & insurance claims ─────────────────────────────────
    private ClaimService NewClaimService(MissingClaim? missing, InsuranceClaim? insurance, Package? package)
    {
        var missingRepo = new Mock<IMissingClaimRepository>();
        missingRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(missing);

        var insuranceRepo = new Mock<IInsuranceClaimRepository>();
        insuranceRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(insurance);
        insuranceRepo.Setup(r => r.GetByPackageAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(new List<InsuranceClaim>());
        insuranceRepo.Setup(r => r.GetByCustomerAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync(insurance is not null ? new List<InsuranceClaim> { insurance } : new List<InsuranceClaim>());

        var packageRepo = new Mock<IPackageRepository>();
        packageRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                   .ReturnsAsync(package);

        return new ClaimService(missingRepo.Object, insuranceRepo.Object, packageRepo.Object,
            Mock.Of<ITrackingEventRepository>(), Mock.Of<INotificationService>(),
            Mock.Of<IModule2UnitOfWork>(), Mock.Of<ILogger<ClaimService>>());
    }

    [Fact]
    public async Task MissingClaim_ChinhChu_XemDuoc()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = MissingClaim.Submit(pkg.Id, _owner);
        var svc   = NewClaimService(claim, null, pkg);

        var result = await svc.GetMissingClaimAsync(claim.Id, requesterCustomerId: _owner);
        Assert.Equal(claim.Id, result.Id);
    }

    [Fact]
    public async Task MissingClaim_KhacChu_Tra404()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = MissingClaim.Submit(pkg.Id, _owner);
        var svc   = NewClaimService(claim, null, pkg);

        await Assert.ThrowsAsync<MissingClaimNotFoundException>(() =>
            svc.GetMissingClaimAsync(claim.Id, requesterCustomerId: _otherCustomer));
    }

    [Fact]
    public async Task MissingClaim_Staff_KhongGioiHan()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = MissingClaim.Submit(pkg.Id, _owner);
        var svc   = NewClaimService(claim, null, pkg);

        // requesterCustomerId = null (staff) → xem được bất kỳ claim nào
        var result = await svc.GetMissingClaimAsync(claim.Id, requesterCustomerId: null);
        Assert.Equal(claim.Id, result.Id);
    }

    [Fact]
    public async Task InsuranceClaim_KhacChu_Tra404_QuaKienHang()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = InsuranceClaim.Submit(pkg.Id, Guid.NewGuid());
        var svc   = NewClaimService(null, claim, pkg);

        await Assert.ThrowsAsync<InsuranceClaimNotFoundException>(() =>
            svc.GetInsuranceClaimAsync(claim.Id, requesterCustomerId: _otherCustomer));
    }

    [Fact]
    public async Task InsuranceClaim_ChinhChu_XemDuoc()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = InsuranceClaim.Submit(pkg.Id, Guid.NewGuid());
        var svc   = NewClaimService(null, claim, pkg);

        var result = await svc.GetInsuranceClaimAsync(claim.Id, requesterCustomerId: _owner);
        Assert.Equal(claim.Id, result.Id);
    }

    [Fact]
    public async Task MyInsuranceClaims_TraDanhSachCuaKhach()
    {
        var pkg   = Package.Create(_owner, Guid.NewGuid(), "PKG001");
        var claim = InsuranceClaim.Submit(pkg.Id, Guid.NewGuid());
        var svc   = NewClaimService(null, claim, pkg);

        var list = await svc.GetMyInsuranceClaimsAsync(_owner);
        Assert.Single(list);
        Assert.Equal(claim.Id, list[0].Id);
    }
}
