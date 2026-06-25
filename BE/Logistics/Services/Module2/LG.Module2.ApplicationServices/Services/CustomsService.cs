using LG.Module2.ApplicationServices.DTOs.Customs;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class CustomsService(
    ICustomsClearanceRepository customsRepo,
    IContainerTripRepository    tripRepo,
    ISackRepository             sackRepo,
    IPackageRepository          packageRepo,
    ITrackingEventRepository    trackingRepo,
    INotificationService        notifyService,
    IModule2UnitOfWork          uow,
    ILogger<CustomsService>     logger
) : ICustomsService
{
    // ── Tạo hồ sơ hải quan cho 1 chuyến container ────────────────────────────────
    public async Task<CustomsClearanceResponse> CreateAsync(CreateCustomsClearanceRequest req, CancellationToken ct = default)
    {
        var trip = await tripRepo.GetByIdAsync(req.ContainerTripId, ct)
                   ?? throw new ContainerTripNotFoundException(req.ContainerTripId);

        if (await customsRepo.GetByTripAsync(req.ContainerTripId, ct) is not null)
            throw new DuplicateCustomsClearanceException(req.ContainerTripId);

        var clearance = CustomsClearance.Create(req.ContainerTripId, req.ClearanceType,
            req.DeclaredValueVnd, req.HsCodeSummary);

        await customsRepo.AddAsync(clearance, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("CustomsClearance created for trip {TripCode}, type {Type}",
            trip.TripCode, req.ClearanceType);

        return MapToResponse(clearance, trip.TripCode, 0);
    }

    public async Task<CustomsClearanceResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var clearance = await customsRepo.GetByIdAsync(id, ct)
                        ?? throw new CustomsClearanceNotFoundException(id);
        var trip = await tripRepo.GetByIdAsync(clearance.ContainerTripId, ct);
        return MapToResponse(clearance, trip?.TripCode, 0);
    }

    public async Task<CustomsClearanceResponse?> GetByTripAsync(Guid containerTripId, CancellationToken ct = default)
    {
        var clearance = await customsRepo.GetByTripAsync(containerTripId, ct);
        if (clearance is null) return null;
        var trip = await tripRepo.GetByIdAsync(containerTripId, ct);
        return MapToResponse(clearance, trip?.TripCode, 0);
    }

    public async Task<List<CustomsClearanceResponse>> GetByStatusAsync(CustomsClearanceStatus status, CancellationToken ct = default)
    {
        var list = await customsRepo.GetByStatusAsync(status, ct);
        return list.Select(c => MapToResponse(c, null, 0)).ToList();
    }

    // ── Cập nhật kết quả thông quan ──────────────────────────────────────────────
    public async Task<CustomsClearanceResponse> UpdateStatusAsync(Guid id, UpdateCustomsClearanceRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var clearance = await customsRepo.GetByIdAsync(id, innerCt)
                            ?? throw new CustomsClearanceNotFoundException(id);

            var trip = await tripRepo.GetByIdAsync(clearance.ContainerTripId, innerCt)
                       ?? throw new ContainerTripNotFoundException(clearance.ContainerTripId);

            clearance.UpdateStatus(req.Status, req.HeldReason, req.CustomsOfficerName, req.DutyPaidVnd);
            await customsRepo.UpdateAsync(clearance, innerCt);

            // Lấy toàn bộ package trong chuyến để đẩy TrackingEvent cho khách
            var packages = await GetTripPackagesAsync(clearance.ContainerTripId, innerCt);
            var affected = 0;

            foreach (var pkg in packages)
            {
                switch (req.Status)
                {
                    case CustomsClearanceStatus.Held:
                        // Chuyển sang trạng thái Customs nếu đang InTransit
                        if (pkg.Status == PackageStatus.InTransit)
                        {
                            pkg.TransitionTo(PackageStatus.Customs);
                            await packageRepo.UpdateAsync(pkg, innerCt);
                        }
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.BorderCustoms,
                            location: trip.BorderCrossing.ToString(),
                            note: $"Hàng bị giữ tại hải quan: {req.HeldReason}"), innerCt);
                        await notifyService.SendCustomsHeldAlertAsync(pkg.CustomerId, pkg.Barcode,
                            req.HeldReason ?? "Không rõ lý do", innerCt);
                        affected++;
                        break;

                    case CustomsClearanceStatus.Cleared:
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.BorderCustoms,
                            location: trip.BorderCrossing.ToString(),
                            note: "Đã thông quan, hàng tiếp tục về kho VN"), innerCt);
                        affected++;
                        break;

                    case CustomsClearanceStatus.Processing:
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.BorderCustoms,
                            location: trip.BorderCrossing.ToString(),
                            note: "Đang làm thủ tục thông quan"), innerCt);
                        affected++;
                        break;
                }
            }

            logger.LogInformation("CustomsClearance {Id} → {Status}, affected {Count} packages",
                id, req.Status, affected);

            return MapToResponse(clearance, trip.TripCode, affected);
        }, ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    private async Task<List<Package>> GetTripPackagesAsync(Guid tripId, CancellationToken ct)
    {
        var sacks = await sackRepo.GetByTripAsync(tripId, ct);
        var result = new List<Package>();
        foreach (var sack in sacks)
            result.AddRange(await packageRepo.GetBySackAsync(sack.Id, ct));
        return result;
    }

    private static CustomsClearanceResponse MapToResponse(CustomsClearance c, string? tripCode, int affected) => new(
        Id:                 c.Id,
        ContainerTripId:    c.ContainerTripId,
        TripCode:           tripCode,
        Status:             c.Status.ToString(),
        ClearanceType:      c.ClearanceType.ToString(),
        DeclaredValueVnd:   c.DeclaredValueVnd,
        HsCodeSummary:      c.HsCodeSummary,
        CustomsOfficerName: c.CustomsOfficerName,
        DutyPaidVnd:        c.DutyPaidVnd,
        HeldReason:         c.HeldReason,
        AffectedPackages:   affected,
        ClearedAt:          c.ClearedAt,
        CreatedAt:          c.CreatedAt,
        UpdatedAt:          c.UpdatedAt
    );
}
