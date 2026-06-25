using System.Text.Json;
using LG.Module2.ApplicationServices.DTOs.Claim;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// UC-2.10 — Khiếu nại thất lạc & bồi thường bảo hiểm.
public class ClaimService(
    IMissingClaimRepository    missingRepo,
    IInsuranceClaimRepository  insuranceRepo,
    IPackageRepository         packageRepo,
    ITrackingEventRepository   trackingRepo,
    INotificationService       notifyService,
    IModule2UnitOfWork         uow,
    ILogger<ClaimService>      logger
) : IClaimService
{
    // ── MissingClaim ─────────────────────────────────────────────────────────────
    public async Task<MissingClaimResponse> CreateMissingClaimAsync(Guid customerId, CreateMissingClaimRequest req, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(req.PackageId, ct)
                      ?? throw new PackageNotFoundException(req.PackageId);
        if (package.CustomerId != customerId)
            throw new PackageNotFoundException(req.PackageId);

        var coverage     = CoveragePct(package);
        var claimedValue = req.ClaimedValueVnd ?? package.DeclaredValueVnd;

        var claim = MissingClaim.Submit(package.Id, customerId, req.Description, req.EvidenceUrls,
                                        claimedValue, coverage);
        await missingRepo.AddAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("MissingClaim {Id} submitted for {Barcode} by {Customer}",
            claim.Id, package.Barcode, customerId);
        return MapMissing(claim, package.Barcode, null);
    }

    public async Task<MissingClaimResponse> GetMissingClaimAsync(Guid id, CancellationToken ct = default)
    {
        var claim   = await missingRepo.GetByIdAsync(id, ct) ?? throw new MissingClaimNotFoundException(id);
        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct);
        var insId   = await FindLinkedInsuranceClaimIdAsync(claim, ct);
        return MapMissing(claim, package?.Barcode ?? "", insId);
    }

    public async Task<List<MissingClaimResponse>> GetMyMissingClaimsAsync(Guid customerId, CancellationToken ct = default)
    {
        var claims = await missingRepo.GetByCustomerAsync(customerId, ct);
        return await MapMissingListAsync(claims, ct);
    }

    public async Task<List<MissingClaimResponse>> GetMissingClaimsByStatusAsync(MissingClaimStatus status, CancellationToken ct = default)
    {
        var claims = await missingRepo.GetByStatusAsync(status, ct);
        return await MapMissingListAsync(claims, ct);
    }

    public async Task<MissingClaimResponse> InvestigateMissingClaimAsync(Guid id, InvestigateClaimRequest req, CancellationToken ct = default)
    {
        var claim = await missingRepo.GetByIdAsync(id, ct) ?? throw new MissingClaimNotFoundException(id);
        if (claim.Status is MissingClaimStatus.Resolved or MissingClaimStatus.Rejected)
            throw new InvalidClaimStateException(claim.Status.ToString(), "điều tra");

        claim.Investigate(req.StaffNote);
        await missingRepo.UpdateAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct);
        return MapMissing(claim, package?.Barcode ?? "", null);
    }

    // Xác nhận thất lạc → bồi thường: tạo InsuranceClaim + hoàn tiền (stub) theo % bảo hiểm.
    public async Task<MissingClaimResponse> ResolveMissingClaimAsync(Guid id, ResolveMissingClaimRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var claim = await missingRepo.GetByIdAsync(id, innerCt) ?? throw new MissingClaimNotFoundException(id);
            if (claim.Status is MissingClaimStatus.Resolved or MissingClaimStatus.Rejected)
                throw new InvalidClaimStateException(claim.Status.ToString(), "xử lý");

            var package = await packageRepo.GetByIdAsync(claim.PackageId, innerCt)
                          ?? throw new PackageNotFoundException(claim.PackageId);

            // Từ chối đi qua nhánh reject để giữ trạng thái đúng
            if (req.Resolution == MissingClaimResolution.Rejected)
            {
                claim.Reject(req.StaffNote ?? "Từ chối bồi thường");
                await missingRepo.UpdateAsync(claim, innerCt);
                await notifyService.SendClaimResolvedAsync(claim.CustomerId, "MissingClaim", "Rejected", innerCt);
                return MapMissing(claim, package.Barcode, null);
            }

            var claimedValue = req.ClaimedValueVnd ?? claim.ClaimedValueVnd ?? package.DeclaredValueVnd ?? 0m;
            Guid? insuranceClaimId = null;

            if (req.Resolution == MissingClaimResolution.Refund)
            {
                var coverage = claim.InsuranceCoveragePct ?? CoveragePct(package);
                if (coverage <= 0m)
                    throw new PackageNotInsuredException(package.Barcode);

                var resolvedAmount = Math.Round(claimedValue * coverage, 0);
                claim.Resolve(MissingClaimResolution.Refund, resolvedAmount);
                await missingRepo.UpdateAsync(claim, innerCt);

                // Đánh dấu kiện thất lạc + tracking
                if (package.Status != PackageStatus.Lost)
                {
                    package.TransitionTo(PackageStatus.Lost);
                    await packageRepo.UpdateAsync(package, innerCt);
                    await trackingRepo.AddAsync(TrackingEvent.Record(package.Id, TrackingEventType.Exception,
                        note: "Xác nhận thất lạc — xử lý bồi thường bảo hiểm"), innerCt);
                }

                // Tạo InsuranceClaim tự động + duyệt + hoàn tiền (stub RefundProcess → Module3)
                var ins = InsuranceClaim.Submit(package.Id, package.OrderId, claim.Id,
                    claimedAmountVnd: claimedValue,
                    description: $"Bồi thường thất lạc (coverage {coverage:P0})");
                ins.Approve(resolvedAmount, "Tự động từ khiếu nại thất lạc đã xác nhận");
                ins.MarkPaid();
                await insuranceRepo.AddAsync(ins, innerCt);
                insuranceClaimId = ins.Id;

                logger.LogInformation("[REFUND-STUB] MissingClaim {Id} → hoàn {Amount} VND về ví khách {Customer}",
                    claim.Id, resolvedAmount, claim.CustomerId);
                await notifyService.SendRefundIssuedAsync(claim.CustomerId, resolvedAmount,
                    $"Bồi thường thất lạc kiện {package.Barcode}", innerCt);
            }
            else // Reship
            {
                claim.Resolve(MissingClaimResolution.Reship, null);
                await missingRepo.UpdateAsync(claim, innerCt);
            }

            await notifyService.SendClaimResolvedAsync(claim.CustomerId, "MissingClaim", req.Resolution.ToString(), innerCt);
            return MapMissing(claim, package.Barcode, insuranceClaimId);
        }, ct);
    }

    public async Task<MissingClaimResponse> RejectMissingClaimAsync(Guid id, RejectClaimRequest req, CancellationToken ct = default)
    {
        var claim = await missingRepo.GetByIdAsync(id, ct) ?? throw new MissingClaimNotFoundException(id);
        if (claim.Status is MissingClaimStatus.Resolved or MissingClaimStatus.Rejected)
            throw new InvalidClaimStateException(claim.Status.ToString(), "từ chối");

        claim.Reject(req.Reason);
        await missingRepo.UpdateAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        await notifyService.SendClaimResolvedAsync(claim.CustomerId, "MissingClaim", "Rejected", ct);
        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct);
        return MapMissing(claim, package?.Barcode ?? "", null);
    }

    // ── InsuranceClaim ───────────────────────────────────────────────────────────
    public async Task<InsuranceClaimResponse> CreateInsuranceClaimAsync(CreateInsuranceClaimRequest req, CancellationToken ct = default)
    {
        var package = await packageRepo.GetByIdAsync(req.PackageId, ct)
                      ?? throw new PackageNotFoundException(req.PackageId);
        if (!package.InsuranceOpted)
            throw new PackageNotInsuredException(package.Barcode);

        var claim = InsuranceClaim.Submit(package.Id, package.OrderId, req.MissingClaimId,
            req.ClaimedAmountVnd, req.Description, req.DamagePhotos);
        await insuranceRepo.AddAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("InsuranceClaim {Id} submitted for {Barcode}", claim.Id, package.Barcode);
        return MapInsurance(claim, package.Barcode);
    }

    public async Task<InsuranceClaimResponse> GetInsuranceClaimAsync(Guid id, CancellationToken ct = default)
    {
        var claim   = await insuranceRepo.GetByIdAsync(id, ct) ?? throw new InsuranceClaimNotFoundException(id);
        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct);
        return MapInsurance(claim, package?.Barcode ?? "");
    }

    public async Task<InsuranceClaimResponse> UpdateInsuranceClaimAsync(Guid id, UpdateInsuranceClaimRequest req, CancellationToken ct = default)
    {
        var claim = await insuranceRepo.GetByIdAsync(id, ct) ?? throw new InsuranceClaimNotFoundException(id);
        if (claim.Status is InsuranceClaimStatus.Paid)
            throw new InvalidClaimStateException(claim.Status.ToString(), "cập nhật");

        switch (req.Status)
        {
            case InsuranceClaimStatus.Approved:
                claim.Approve(req.ApprovedAmountVnd ?? claim.ClaimedAmountVnd ?? 0m, req.Notes);
                break;
            case InsuranceClaimStatus.Rejected:
                claim.Reject(req.Notes ?? "Từ chối bồi thường");
                break;
            case InsuranceClaimStatus.UnderReview:
                claim.SetUnderReview();
                break;
            default:
                throw new InvalidClaimStateException(req.Status.ToString(), "cập nhật");
        }

        await insuranceRepo.UpdateAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct);
        return MapInsurance(claim, package?.Barcode ?? "");
    }

    // Chi trả bồi thường (hoàn tiền về ví — stub Module3 RefundProcess)
    public async Task<InsuranceClaimResponse> PayInsuranceClaimAsync(Guid id, CancellationToken ct = default)
    {
        var claim = await insuranceRepo.GetByIdAsync(id, ct) ?? throw new InsuranceClaimNotFoundException(id);
        if (claim.Status != InsuranceClaimStatus.Approved)
            throw new InvalidClaimStateException(claim.Status.ToString(), "chi trả");

        var package = await packageRepo.GetByIdAsync(claim.PackageId, ct)
                      ?? throw new PackageNotFoundException(claim.PackageId);

        claim.MarkPaid();
        await insuranceRepo.UpdateAsync(claim, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("[REFUND-STUB] InsuranceClaim {Id} → hoàn {Amount} VND về ví khách {Customer}",
            claim.Id, claim.ApprovedAmount, package.CustomerId);
        await notifyService.SendRefundIssuedAsync(package.CustomerId, claim.ApprovedAmount ?? 0m,
            $"Bồi thường bảo hiểm kiện {package.Barcode}", ct);

        return MapInsurance(claim, package.Barcode);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    private static decimal CoveragePct(Package p) => p.InsuranceOpted
        ? p.InsuranceLevel switch
        {
            InsuranceLevel.Full  => 1.0m,
            InsuranceLevel.Basic => 0.5m,
            _                    => 0m,
        }
        : 0m;

    private async Task<Guid?> FindLinkedInsuranceClaimIdAsync(MissingClaim claim, CancellationToken ct)
    {
        var list = await insuranceRepo.GetByPackageAsync(claim.PackageId, ct);
        return list.FirstOrDefault(i => i.MissingClaimId == claim.Id)?.Id;
    }

    private async Task<List<MissingClaimResponse>> MapMissingListAsync(List<MissingClaim> claims, CancellationToken ct)
    {
        var result = new List<MissingClaimResponse>(claims.Count);
        foreach (var c in claims)
        {
            var package = await packageRepo.GetByIdAsync(c.PackageId, ct);
            var insId   = await FindLinkedInsuranceClaimIdAsync(c, ct);
            result.Add(MapMissing(c, package?.Barcode ?? "", insId));
        }
        return result;
    }

    private static MissingClaimResponse MapMissing(MissingClaim c, string barcode, Guid? insuranceClaimId) => new(
        Id:                   c.Id,
        PackageId:            c.PackageId,
        Barcode:              barcode,
        CustomerId:           c.CustomerId,
        Status:               c.Status.ToString(),
        Description:          c.Description,
        EvidenceUrls:         DeserializeUrls(c.EvidenceUrls),
        ClaimedValueVnd:      c.ClaimedValueVnd,
        InsuranceCoveragePct: c.InsuranceCoveragePct,
        ResolvedAmountVnd:    c.ResolvedAmountVnd,
        Resolution:           c.Resolution?.ToString(),
        StaffNote:            c.StaffNote,
        InsuranceClaimId:     insuranceClaimId,
        CreatedAt:            c.CreatedAt,
        UpdatedAt:            c.UpdatedAt
    );

    private static InsuranceClaimResponse MapInsurance(InsuranceClaim c, string barcode) => new(
        Id:             c.Id,
        PackageId:      c.PackageId,
        Barcode:        barcode,
        OrderId:        c.OrderId,
        MissingClaimId: c.MissingClaimId,
        Status:         c.Status.ToString(),
        DamagePhotos:   DeserializeUrls(c.DamagePhotos),
        ApprovedAmount: c.ApprovedAmount,
        AdjusterNote:   c.AdjusterNote,
        CreatedAt:      c.CreatedAt,
        UpdatedAt:      c.UpdatedAt
    );

    private static List<string> DeserializeUrls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); }
        catch (JsonException) { return new(); }
    }
}
