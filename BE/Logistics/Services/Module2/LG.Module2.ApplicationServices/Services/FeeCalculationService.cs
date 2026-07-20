using LG.Module2.ApplicationServices.DTOs.Package;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// UC-2.07 — Tính & thu cước vận chuyển quốc tế sau khi cân tại kho VN.
public class FeeCalculationService(
    IPackageRepository            packageRepo,
    IWalletService                walletService,
    INotificationService          notifier,
    IModule2UnitOfWork            uow,
    ILogger<FeeCalculationService> logger
) : IFeeCalculationService
{
    public async Task<PackageFeeResponse> CalculateAsync(Guid packageId, CalculateFeeRequest req, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(packageId, ct)
                      ?? throw new PackageNotFoundException(packageId);

        // Đã thu tiền thì không cho tính lại (khỏi lệch giữa số đã thu và số hiển thị)
        if (package.FeePaidAt is not null)
            throw new FeeAlreadyPaidException(package.Barcode);

        package.CalculateInternationalFee(req.RatePerKgVnd, req.InsuranceRate, req.DeclaredValueVnd);
        await packageRepo.UpdateAsync(package, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("Fee calculated for {Barcode}: charged={Charged}kg × {Rate} = {Ship}, insurance={Ins}",
            package.Barcode, package.ChargedWeightKg, req.RatePerKgVnd, package.ShipIntlVnd, package.InsuranceFeeVnd);

        return MapToFee(package);
    }

    // ── Thu cước quốc tế thật: trừ ví khách (HTTP Core Finance) ──────────────────
    // Ordering an toàn (giống DeliveryService): trừ ví TRƯỚC (ngoài transaction) →
    // Tx đánh dấu FeePaidAt. Nếu Tx fail sau khi đã trừ → HOÀN lại (compensation) rồi
    // ném lỗi, tránh khách bị trừ mà kiện vẫn "chưa thu" (retry sẽ trừ lần nữa).
    public async Task<PackageFeeResponse> ChargeAsync(Guid packageId, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(packageId, ct)
                      ?? throw new PackageNotFoundException(packageId);

        if (package.FeeCalculatedAt is null)
            throw new FeeNotCalculatedException(package.Barcode);
        if (package.FeePaidAt is not null)
            throw new FeeAlreadyPaidException(package.Barcode);

        var amount = package.TotalIntlFeeVnd;   // ship (>0) + insurance (≥0) — luôn > 0 khi đã tính cước

        // Trừ ví (thiếu số dư / Core lỗi → WalletOperationFailedException 422, chưa đánh dấu gì)
        await walletService.DeductAsync(package.CustomerId, amount, "PackageIntlFee", package.Id,
            $"Cước vận chuyển quốc tế kiện {package.Barcode}", ct);

        try
        {
            await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                package.MarkFeePaid();
                await packageRepo.UpdateAsync(package, innerCt);
            }, ct);
        }
        catch (Exception ex)
        {
            // Đã trừ tiền nhưng không đánh dấu được → hoàn lại để khách không mất tiền oan
            logger.LogError(ex, "Đánh dấu thu cước kiện {Barcode} thất bại sau khi trừ ví — hoàn {Amount} VND",
                package.Barcode, amount);
            try
            {
                await walletService.RefundAsync(package.CustomerId, amount, "PackageIntlFee", package.Id,
                    $"Hoàn cước quốc tế — đánh dấu thu thất bại kiện {package.Barcode}", CancellationToken.None);
            }
            catch (Exception refundEx)
            {
                logger.LogError(refundEx, "Compensation: không hoàn được {Amount} VND ví khách {CustomerId} (kiện {Barcode}) — cần đối soát tay",
                    amount, package.CustomerId, package.Barcode);
            }
            throw;
        }

        logger.LogInformation("Đã thu cước quốc tế {Amount} VND kiện {Barcode} (khách {CustomerId})",
            amount, package.Barcode, package.CustomerId);
        await notifier.SendIntlFeeChargedAsync(package.CustomerId, package.Barcode, amount, ct);

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
        decimal? total = p.TotalIntlFeeVnd;
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
            CalculatedAt:    p.FeeCalculatedAt,
            PaidAt:          p.FeePaidAt
        );
    }
}
