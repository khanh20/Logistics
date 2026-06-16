using LG.Module2.ApplicationServices.DTOs.Sack;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class SackService(
    ISackRepository    sackRepo,
    IPackageRepository packageRepo,
    IModule2UnitOfWork uow,
    ILogger<SackService> logger
) : ISackService
{
    public async Task<SackDetailResponse> CreateAsync(CreateSackRequest req, CancellationToken ct = default)
    {
        var code = req.SackCode?.Trim().ToUpper() ?? GenerateSackCode();

        if (await sackRepo.GetBySackCodeAsync(code, ct) is not null)
            throw new InvalidOperationException($"Mã bao '{code}' đã tồn tại.");

        var sack = Sack.Create(code);
        await sackRepo.AddAsync(sack, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Sack created: {SackCode}", code);
        return MapToDetail(sack, []);
    }

    public async Task<SackDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var sack = await sackRepo.GetByIdAsync(id, ct) ?? throw new SackNotFoundException(id);
        var packages = await packageRepo.GetBySackAsync(id, ct);
        return MapToDetail(sack, packages);
    }

    public async Task<SackDetailResponse> GetBySackCodeAsync(string sackCode, CancellationToken ct = default)
    {
        var sack = await sackRepo.GetBySackCodeAsync(sackCode, ct) ?? throw new SackNotFoundException(sackCode);
        var packages = await packageRepo.GetBySackAsync(sack.Id, ct);
        return MapToDetail(sack, packages);
    }

    public async Task<List<SackSummaryResponse>> GetByStatusAsync(SackStatus status, CancellationToken ct = default)
    {
        var sacks = await sackRepo.GetByStatusAsync(status, ct);
        return sacks.Select(MapToSummary).ToList();
    }

    public async Task<SackDetailResponse> AddPackageAsync(Guid sackId, Guid staffId,
        AddPackageToSackRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var sack = await sackRepo.GetByIdAsync(sackId, innerCt) ?? throw new SackNotFoundException(sackId);

            var package = await packageRepo.GetByBarcodeAsync(req.Barcode, innerCt)
                          ?? throw new PackageNotFoundException(req.Barcode);

            if (package.SackId.HasValue)
                throw new PackageAlreadyInSackException(package.Id);

            // Business rule: không gộp fragile với thường
            var currentPackages = await packageRepo.GetBySackAsync(sackId, innerCt);
            if (package.PackagingType == PackagingType.Fragile && currentPackages.Any(p => p.PackagingType != PackagingType.Fragile))
                throw new SackMixedFragileException();
            if (package.PackagingType != PackagingType.Fragile && currentPackages.Any(p => p.PackagingType == PackagingType.Fragile))
                throw new SackMixedFragileException();

            package.AssignSack(sackId);
            package.TransitionTo(PackageStatus.InSack);

            var map = SackPackageMap.Add(sackId, package.Id);
            sack.PackageMaps.Add(map);

            // Cập nhật tổng khối lượng bao
            var newTotal = currentPackages.Sum(p => p.ChargedWeightKg ?? 0) + (package.ChargedWeightKg ?? 0);
            sack.RecalculateWeight(newTotal);

            await packageRepo.UpdateAsync(package, innerCt);
            await sackRepo.UpdateAsync(sack, innerCt);

            logger.LogInformation("Package {Barcode} added to sack {SackCode}", req.Barcode, sack.SackCode);

            var updatedPackages = await packageRepo.GetBySackAsync(sackId, innerCt);
            return MapToDetail(sack, updatedPackages);
        }, ct);
    }

    public async Task<SackDetailResponse> RemovePackageAsync(Guid sackId, string barcode, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var sack = await sackRepo.GetByIdAsync(sackId, innerCt) ?? throw new SackNotFoundException(sackId);

            if (sack.Status != SackStatus.Packing)
                throw new SackSealedException(sackId);

            var package = await packageRepo.GetByBarcodeAsync(barcode, innerCt)
                          ?? throw new PackageNotFoundException(barcode);

            var map = sack.PackageMaps.FirstOrDefault(m => m.PackageId == package.Id && m.RemovedAt == null);
            if (map is null) throw new InvalidOperationException($"Kiện '{barcode}' không có trong bao này.");

            map.Remove();
            package.RemoveFromSack();
            package.TransitionTo(PackageStatus.InCnWarehouse);

            var remaining = await packageRepo.GetBySackAsync(sackId, innerCt);
            var newTotal  = remaining.Where(p => p.Id != package.Id).Sum(p => p.ChargedWeightKg ?? 0);
            sack.RecalculateWeight(newTotal);

            await packageRepo.UpdateAsync(package, innerCt);
            await sackRepo.UpdateAsync(sack, innerCt);

            logger.LogInformation("Package {Barcode} removed from sack {SackCode}", barcode, sack.SackCode);

            var updatedPackages = await packageRepo.GetBySackAsync(sackId, innerCt);
            return MapToDetail(sack, updatedPackages);
        }, ct);
    }

    public async Task<SackDetailResponse> SealAsync(Guid sackId, Guid staffId,
        SealSackRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var sack = await sackRepo.GetByIdAsync(sackId, innerCt) ?? throw new SackNotFoundException(sackId);
            var packages = await packageRepo.GetBySackAsync(sackId, innerCt);

            if (!packages.Any())
                throw new InvalidOperationException("Không thể kẹp chì bao rỗng.");

            sack.Seal(req.SealCode);
            await sackRepo.UpdateAsync(sack, innerCt);

            logger.LogInformation("Sack {SackCode} sealed with seal {SealCode} by staff {StaffId}",
                sack.SackCode, req.SealCode, staffId);

            return MapToDetail(sack, packages);
        }, ct);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    private static SackSummaryResponse MapToSummary(Sack s) => new(
        Id:             s.Id,
        SackCode:       s.SackCode,
        Status:         s.Status.ToString(),
        TotalWeightKg:  s.TotalWeightKg,
        TotalPackages:  s.TotalPackages,
        SealCode:       s.SealCode,
        ContainerTripId: s.ContainerTripId,
        CreatedAt:      s.CreatedAt
    );

    private static SackDetailResponse MapToDetail(Sack s, List<Package> packages) => new(
        Id:             s.Id,
        SackCode:       s.SackCode,
        Status:         s.Status.ToString(),
        TotalWeightKg:  s.TotalWeightKg,
        TotalPackages:  s.TotalPackages,
        SealCode:       s.SealCode,
        ContainerTripId: s.ContainerTripId,
        Packages:       packages.Select(p => new SackPackageItemResponse(
            PackageId:       p.Id,
            Barcode:         p.Barcode,
            PackageStatus:   p.Status.ToString(),
            PackagingType:   p.PackagingType.ToString(),
            ChargedWeightKg: p.ChargedWeightKg,
            AddedAt:         p.UpdatedAt
        )).ToList(),
        CreatedAt:      s.CreatedAt,
        UpdatedAt:      s.UpdatedAt
    );

    private static string GenerateSackCode()
    {
        var date   = DateTime.UtcNow.ToString("yyyyMMdd");
        var random = Convert.ToHexString(Guid.NewGuid().ToByteArray())[..6];
        return $"SACK-{date}-{random}";
    }
}
