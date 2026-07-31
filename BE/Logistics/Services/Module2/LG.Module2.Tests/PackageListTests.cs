using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.ApplicationServices.Services;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;
using Moq;

namespace LG.Module2.Tests;

public class PackageListTests
{
    private readonly Mock<IPackageRepository> _packageRepo = new();

    private PackageService NewService() => new(
        _packageRepo.Object,
        Mock.Of<IWarehouseZoneRepository>(),
        Mock.Of<ITrackingEventRepository>(),
        Mock.Of<IBarcodeService>(),
        Mock.Of<IModule2UnitOfWork>(),
        Mock.Of<ILogger<PackageService>>());

    [Fact]
    public async Task GetPaged_TraDanhSachVaTongSoKien()
    {
        var first = Package.Create(Guid.NewGuid(), Guid.NewGuid(), "LG-TEST-001", PackagingType.Fragile);
        var second = Package.Create(Guid.NewGuid(), Guid.NewGuid(), "LG-TEST-002");
        _packageRepo
            .Setup(r => r.GetPagedAsync(2, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<Package> { first, second }, 42));

        var result = await NewService().GetPagedAsync(2, 20);

        Assert.Equal(42, result.TotalCount);
        Assert.Equal(2, result.Page);
        Assert.Equal(20, result.PageSize);
        Assert.Collection(result.Items,
            item => Assert.Equal("LG-TEST-001", item.Barcode),
            item => Assert.Equal("LG-TEST-002", item.Barcode));
    }

    [Theory]
    [InlineData(0, 0, 1, 1)]
    [InlineData(-5, 500, 1, 100)]
    public async Task GetPaged_ChuanHoaGioiHanPhanTrang(
        int page, int pageSize, int expectedPage, int expectedPageSize)
    {
        _packageRepo
            .Setup(r => r.GetPagedAsync(expectedPage, expectedPageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<Package>(), 0));

        var result = await NewService().GetPagedAsync(page, pageSize);

        Assert.Equal(expectedPage, result.Page);
        Assert.Equal(expectedPageSize, result.PageSize);
        _packageRepo.Verify(
            r => r.GetPagedAsync(expectedPage, expectedPageSize, It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
