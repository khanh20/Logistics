using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class PackageService(
    IPackageRepository       packageRepo,
    IWarehouseZoneRepository zoneRepo,
    ITrackingEventRepository trackingRepo,
    IBarcodeService          barcodeService,
    IModule2UnitOfWork       uow,
    ILogger<PackageService>  logger
) : IPackageService
{
    public async Task<PackageSummaryResponse> CreateAsync(CreatePackageRequest req, CancellationToken ct = default)
    {
        var barcode = await barcodeService.GenerateAsync(ct);
        var package = Package.Create(req.CustomerId, req.OrderId, barcode, req.PackagingType);

        if (req.InsuranceOpted && req.InsuranceLevel.HasValue)
            package.EnableInsurance(req.InsuranceLevel.Value);

        await packageRepo.AddAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Package created: {Barcode} for Order {OrderId}", barcode, req.OrderId);
        return MapToSummary(package);
    }

    public async Task<PackageDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(id, ct)
                      ?? throw new PackageNotFoundException(id);
        var tracking = await trackingRepo.GetByPackageAsync(id, ct);
        return await MapToDetailAsync(package, tracking, ct);
    }

    public async Task<PackageDetailResponse> GetByBarcodeAsync(string barcode, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByBarcodeAsync(barcode, ct)
                      ?? throw new PackageNotFoundException(barcode);
        var tracking = await trackingRepo.GetByPackageAsync(package.Id, ct);
        return await MapToDetailAsync(package, tracking, ct);
    }

    public async Task<List<PackageSummaryResponse>> GetByOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var packages = await packageRepo.GetByOrderAsync(orderId, ct);
        return packages.Select(MapToSummary).ToList();
    }

    public async Task<List<PackageSummaryResponse>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default)
    {
        var packages = await packageRepo.GetByCustomerAsync(customerId, ct);
        return packages.Select(MapToSummary).ToList();
    }

    public async Task<PackageImageResponse> UploadImageAsync(Guid staffId, UploadPackageImageRequest req, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(req.PackageId, ct)
                      ?? throw new PackageNotFoundException(req.PackageId);

        var image = PackageImage.Upload(package.Id, req.Type, req.Url, staffId, req.Note);
        package.Images.Add(image);
        await packageRepo.UpdateAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        return new PackageImageResponse(image.Id, image.Type.ToString(), image.Url, image.Note, image.CreatedAt);
    }

    public async Task<List<TrackingEventResponse>> GetTrackingAsync(Guid packageId, CancellationToken ct = default)
    {
        var events = await trackingRepo.GetByPackageAsync(packageId, ct);
        return events.Select(MapTrackingEvent).ToList();
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    internal static PackageSummaryResponse MapToSummary(Package p) => new(
        Id:             p.Id,
        Barcode:        p.Barcode,
        Status:         p.Status.ToString(),
        PackagingType:  p.PackagingType.ToString(),
        CustomerId:     p.CustomerId,
        OrderId:        p.OrderId,
        ActualWeightKg: p.ActualWeightKg,
        ChargedWeightKg: p.ChargedWeightKg,
        InsuranceOpted: p.InsuranceOpted,
        InsuranceLevel: p.InsuranceLevel?.ToString(),
        CreatedAt:      p.CreatedAt
    );

    private async Task<PackageDetailResponse> MapToDetailAsync(Package p, List<TrackingEvent> tracking,
                                                                CancellationToken ct)
    {
        string? zoneCode = null;
        if (p.ZoneId.HasValue)
        {
            var zone = await zoneRepo.GetByIdAsync(p.ZoneId.Value, ct);
            zoneCode = zone?.Code;
        }

        return new PackageDetailResponse(
            Id:             p.Id,
            Barcode:        p.Barcode,
            Status:         p.Status.ToString(),
            PackagingType:  p.PackagingType.ToString(),
            CustomerId:     p.CustomerId,
            OrderId:        p.OrderId,
            WaybillId:      p.WaybillId,
            SackId:         p.SackId,
            ZoneId:         p.ZoneId,
            ZoneCode:       zoneCode,
            ActualWeightKg: p.ActualWeightKg,
            LengthCm:       p.LengthCm,
            WidthCm:        p.WidthCm,
            HeightCm:       p.HeightCm,
            VolWeightKg:    p.VolWeightKg,
            ChargedWeightKg: p.ChargedWeightKg,
            InsuranceOpted: p.InsuranceOpted,
            InsuranceLevel: p.InsuranceLevel?.ToString(),
            TrackingHistory: tracking.Select(MapTrackingEvent).ToList(),
            CreatedAt:      p.CreatedAt,
            UpdatedAt:      p.UpdatedAt
        );
    }

    internal static TrackingEventResponse MapTrackingEvent(TrackingEvent e) => new(
        Id:        e.Id,
        Type:      e.Type.ToString(),
        TypeLabel: TrackingLabel(e.Type),
        Location:  e.Location,
        Note:      e.Note,
        OccuredAt: e.OccuredAt
    );

    private static string TrackingLabel(TrackingEventType t) => t switch
    {
        TrackingEventType.CnWarehouseIn  => "Nhập kho Trung Quốc",
        TrackingEventType.CnWarehouseOut => "Xuất kho Trung Quốc",
        TrackingEventType.BorderCustoms  => "Qua cửa khẩu / hải quan",
        TrackingEventType.VnWarehouseIn  => "Nhập kho Việt Nam",
        TrackingEventType.OutForDelivery => "Đang giao hàng",
        TrackingEventType.Delivered      => "Đã giao thành công",
        TrackingEventType.DeliveryFailed => "Giao hàng thất bại",
        TrackingEventType.Exception      => "Sự cố",
        _                                => t.ToString(),
    };
}
