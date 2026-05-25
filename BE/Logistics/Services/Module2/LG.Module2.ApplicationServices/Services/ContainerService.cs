using LG.Module2.ApplicationServices.DTOs.Container;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class ContainerService(
    IContainerTripRepository  tripRepo,
    ISackRepository           sackRepo,
    IPackageRepository        packageRepo,
    ITrackingEventRepository  trackingRepo,
    IModule2UnitOfWork        uow,
    ILogger<ContainerService> logger
) : IContainerService
{
    public async Task<TripDetailResponse> CreateTripAsync(CreateTripRequest req, CancellationToken ct = default)
    {
        if (await tripRepo.GetByTripCodeAsync(req.TripCode, ct) is not null)
            throw new InvalidOperationException($"Mã chuyến '{req.TripCode}' đã tồn tại.");

        var trip = ContainerTrip.Create(req.TripCode, req.BorderCrossing, req.VehiclePlate, req.DriverPhone, req.EtaVnAt);
        await tripRepo.AddAsync(trip, ct);
        await uow.SaveChangesAsync(ct);

        logger.LogInformation("ContainerTrip created: {TripCode}", req.TripCode);
        return MapToDetail(trip, []);
    }

    public async Task<TripDetailResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var trip  = await tripRepo.GetByIdAsync(id, ct) ?? throw new ContainerTripNotFoundException(id);
        var sacks = await sackRepo.GetByTripAsync(id, ct);
        return MapToDetail(trip, sacks);
    }

    public async Task<List<TripSummaryResponse>> GetByStatusAsync(ContainerTripStatus status, CancellationToken ct = default)
    {
        var trips = await tripRepo.GetByStatusAsync(status, ct);
        return trips.Select(t => MapToSummary(t, 0)).ToList();
    }

    public async Task<TripDetailResponse> AssignSacksAsync(Guid tripId, AssignSacksRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var trip = await tripRepo.GetByIdAsync(tripId, innerCt)
                       ?? throw new ContainerTripNotFoundException(tripId);

            if (trip.Status != ContainerTripStatus.Loading)
                throw new InvalidOperationException($"Chuyến '{trip.TripCode}' đang ở trạng thái {trip.Status}, không thể thêm bao.");

            foreach (var sackCode in req.SackCodes)
            {
                var sack = await sackRepo.GetBySackCodeAsync(sackCode, innerCt)
                           ?? throw new SackNotFoundException(sackCode);

                if (sack.Status != SackStatus.Sealed)
                    throw new InvalidOperationException($"Bao '{sackCode}' chưa kẹp chì, không thể xếp lên container.");

                sack.AssignToTrip(tripId);
                await sackRepo.UpdateAsync(sack, innerCt);
            }

            logger.LogInformation("Trip {TripCode}: assigned {Count} sacks", trip.TripCode, req.SackCodes.Count);

            var sacks = await sackRepo.GetByTripAsync(tripId, innerCt);
            return MapToDetail(trip, sacks);
        }, ct);
    }

    public async Task<TripDetailResponse> DepartAsync(Guid tripId, DepartTripRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var trip  = await tripRepo.GetByIdAsync(tripId, innerCt) ?? throw new ContainerTripNotFoundException(tripId);
            var sacks = await sackRepo.GetByTripAsync(tripId, innerCt);

            if (!sacks.Any())
                throw new InvalidOperationException("Không thể xuất phát khi chưa xếp bao nào lên container.");

            trip.Depart(req.DepartureAt);
            await tripRepo.UpdateAsync(trip, innerCt);

            // Cập nhật tất cả package trong chuyến → InTransit + ghi TrackingEvent
            foreach (var sack in sacks)
            {
                var packages = await packageRepo.GetBySackAsync(sack.Id, innerCt);
                foreach (var pkg in packages.Where(p => p.Status == PackageStatus.InSack))
                {
                    pkg.TransitionTo(PackageStatus.InTransit);
                    var evt = TrackingEvent.Record(pkg.Id, TrackingEventType.CnWarehouseOut,
                        location: "Đang vận chuyển về Việt Nam",
                        note: $"Chuyến {trip.TripCode} — Cửa khẩu {trip.BorderCrossing}");
                    await trackingRepo.AddAsync(evt, innerCt);
                    await packageRepo.UpdateAsync(pkg, innerCt);
                }
            }

            logger.LogInformation("Trip {TripCode} departed at {At}", trip.TripCode, req.DepartureAt);
            return MapToDetail(trip, sacks);
        }, ct);
    }

    public async Task<TripDetailResponse> ReachBorderAsync(Guid tripId, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var trip  = await tripRepo.GetByIdAsync(tripId, innerCt) ?? throw new ContainerTripNotFoundException(tripId);
            var sacks = await sackRepo.GetByTripAsync(tripId, innerCt);

            trip.ReachBorder();
            await tripRepo.UpdateAsync(trip, innerCt);

            // Ghi TrackingEvent hải quan cho toàn bộ package
            foreach (var sack in sacks)
            {
                var packages = await packageRepo.GetBySackAsync(sack.Id, innerCt);
                foreach (var pkg in packages.Where(p => p.Status == PackageStatus.InTransit))
                {
                    var evt = TrackingEvent.Record(pkg.Id, TrackingEventType.BorderCustoms,
                        location: trip.BorderCrossing.ToString(),
                        note: "Hàng đang qua cửa khẩu / làm thủ tục hải quan");
                    await trackingRepo.AddAsync(evt, innerCt);
                }
            }

            logger.LogInformation("Trip {TripCode} reached border {Border}", trip.TripCode, trip.BorderCrossing);
            return MapToDetail(trip, sacks);
        }, ct);
    }

    public async Task<TripDetailResponse> ArriveVietnamAsync(Guid tripId, ArriveVietnamRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var trip  = await tripRepo.GetByIdAsync(tripId, innerCt) ?? throw new ContainerTripNotFoundException(tripId);
            var sacks = await sackRepo.GetByTripAsync(tripId, innerCt);

            trip.ArriveVietnam(req.ArrivedAt);

            foreach (var sack in sacks)
            {
                sack.MarkArrived();
                await sackRepo.UpdateAsync(sack, innerCt);
            }

            await tripRepo.UpdateAsync(trip, innerCt);

            // Notify NV kho VN (stub) — Phase 6 sẽ gửi thật
            logger.LogInformation("Trip {TripCode} arrived VN at {At} — notify warehouse staff",
                trip.TripCode, req.ArrivedAt);

            return MapToDetail(trip, sacks);
        }, ct);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    private static TripSummaryResponse MapToSummary(ContainerTrip t, int totalSacks) => new(
        Id:            t.Id,
        TripCode:      t.TripCode,
        Status:        t.Status.ToString(),
        BorderCrossing: t.BorderCrossing.ToString(),
        VehiclePlate:  t.VehiclePlate,
        DriverPhone:   t.DriverPhone,
        TotalSacks:    totalSacks,
        DepartureCnAt: t.DepartureCnAt,
        EtaVnAt:       t.EtaVnAt,
        ArrivedVnAt:   t.ArrivedVnAt,
        CreatedAt:     t.CreatedAt
    );

    private static TripDetailResponse MapToDetail(ContainerTrip t, List<Sack> sacks) => new(
        Id:            t.Id,
        TripCode:      t.TripCode,
        Status:        t.Status.ToString(),
        BorderCrossing: t.BorderCrossing.ToString(),
        VehiclePlate:  t.VehiclePlate,
        DriverPhone:   t.DriverPhone,
        DepartureCnAt: t.DepartureCnAt,
        EtaVnAt:       t.EtaVnAt,
        ArrivedVnAt:   t.ArrivedVnAt,
        Sacks: sacks.Select(s => new TripSackItemResponse(
            SackId:       s.Id,
            SackCode:     s.SackCode,
            SackStatus:   s.Status.ToString(),
            TotalWeightKg: s.TotalWeightKg,
            TotalPackages: s.TotalPackages,
            SealCode:     s.SealCode
        )).ToList(),
        CreatedAt: t.CreatedAt,
        UpdatedAt: t.UpdatedAt
    );
}
