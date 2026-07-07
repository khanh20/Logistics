using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// UC-2.07 — Tính cước vận chuyển quốc tế sau khi cân tại kho VN.
public class FeeCalculationService(
    IPackageRepository            packageRepo,
    IModule2UnitOfWork            uow,
    ILogger<FeeCalculationService> logger
) : IFeeCalculationService
{
    public async Task<PackageFeeResponse> CalculateAsync(Guid packageId, CalculateFeeRequest req, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(packageId, ct)
                      ?? throw new PackageNotFoundException(packageId);

        package.CalculateInternationalFee(req.RatePerKgVnd, req.InsuranceRate, req.DeclaredValueVnd);
        await packageRepo.UpdateAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Fee calculated for {Barcode}: charged={Charged}kg × {Rate} = {Ship}, insurance={Ins}",
            package.Barcode, package.ChargedWeightKg, req.RatePerKgVnd, package.ShipIntlVnd, package.InsuranceFeeVnd);

        return MapToFee(package);
    }

    public async Task<PackageFeeResponse> GetFeeAsync(Guid packageId, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(packageId, ct)
                      ?? throw new PackageNotFoundException(packageId);
        return MapToFee(package);
    }

    private static PackageFeeResponse MapToFee(Domain.Entities.Package p)
    {
        decimal? total = (p.ShipIntlVnd ?? 0m) + (p.InsuranceFeeVnd ?? 0m);
        if (p.FeeCalculatedAt is null) total = null;  // chưa tính cước

        return new PackageFeeResponse(
            PackageId:       p.Id,
            Barcode:         p.Barcode,
            Status:          p.Status.ToString(),
            ChargedWeightKg: p.ChargedWeightKg,
            RatePerKgVnd:    p.FeeRatePerKgVnd,
            ShipIntlVnd:     p.ShipIntlVnd,
            InsuranceOpted:  p.InsuranceOpted,
            InsuranceFeeVnd: p.InsuranceFeeVnd,
            TotalFeeVnd:     total,
            CalculatedAt:    p.FeeCalculatedAt
        );
    }
}
