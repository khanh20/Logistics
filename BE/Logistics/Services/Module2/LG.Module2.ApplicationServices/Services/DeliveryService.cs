using LG.Module2.ApplicationServices.DTOs.Carrier;
using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class DeliveryService(
    IDeliveryRequestRepository deliveryRepo,
    IDomesticCarrierRepository carrierRepo,
    IDomesticWaybillRepository waybillRepo,
    IPackageRepository         packageRepo,
    ITrackingEventRepository   trackingRepo,
    ICarrierGatewayResolver    gatewayResolver,
    INotificationService       notifyService,
    IModule2UnitOfWork         uow,
    ILogger<DeliveryService>   logger
) : IDeliveryService
{
    // ── UC-2.08: Khách tạo yêu cầu giao nội địa ──────────────────────────────────
    public async Task<DeliveryRequestResponse> CreateAsync(Guid customerId, CreateDeliveryRequest req, CancellationToken ct = default)
    {
        if (req.PackageIds is null || req.PackageIds.Count == 0)
            throw new EmptyDeliveryRequestException();

        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var carrier = await carrierRepo.GetByIdAsync(req.CarrierId, innerCt)
                          ?? throw new DomesticCarrierNotFoundException(req.CarrierId);
            if (!carrier.IsActive)
                throw new CarrierInactiveException(carrier.Name);

            // Nạp & validate package
            var packages = new List<Package>();
            decimal totalWeight = 0m;
            decimal totalValue  = 0m;
            foreach (var pid in req.PackageIds.Distinct())
            {
                var pkg = await packageRepo.GetByIdAsync(pid, innerCt)
                          ?? throw new PackageNotFoundException(pid);
                if (pkg.CustomerId != customerId)
                    throw new PackageNotFoundException(pid);  // không lộ kiện của người khác
                if (pkg.Status != PackageStatus.InVnWarehouse)
                    throw new PackageNotReadyForDeliveryException(pkg.Barcode, pkg.Status.ToString());

                packages.Add(pkg);
                totalWeight += pkg.ChargedWeightKg ?? pkg.ActualWeightKg ?? 0m;
                totalValue  += pkg.DeclaredValueVnd ?? 0m;
            }

            if (totalWeight > carrier.MaxWeightKg)
                throw new PackageWeightExceededException(carrier.Name, carrier.MaxWeightKg, totalWeight);

            // Tạo yêu cầu giao + gắn package
            var request = DeliveryRequest.Create(customerId, req.DeliveryAddressId, req.PreferredTimeSlot, req.CodAmount);
            foreach (var pkg in packages)
                request.Packages.Add(DeliveryPackage.Create(request.Id, pkg.Id));

            // Chọn gateway carrier (GHTK thật / fallback) + dựng context giao hàng
            var gateway = gatewayResolver.Resolve(carrier.Name);
            var ctx = new CarrierShipmentContext(
                CarrierName:       carrier.Name,
                DeliveryRequestId: request.Id,
                PartnerOrderCode:  request.Id.ToString("N"),
                RecipientName:     req.RecipientName,
                RecipientTel:      req.RecipientTel,
                Province:          req.Province,
                District:          req.District,
                Ward:              req.Ward,
                Address:           req.Address,
                WeightKg:          totalWeight,
                ValueVnd:          totalValue,
                CodAmount:         req.CodAmount,
                Items:             packages.Select(p => new CarrierItem(
                                       p.Barcode, p.ChargedWeightKg ?? p.ActualWeightKg ?? 0.5m, 1)).ToList()
            );

            // Báo giá phí ship qua carrier
            var quote = await gateway.QuoteAsync(ctx, innerCt);
            request.SetShipFee(quote.ShipFeeVnd, carrier.Id);

            // TODO Phase tài chính: trừ ví khách (PaymentLock) qua Module3 — hiện log placeholder
            logger.LogInformation("[WALLET-STUB] Trừ ví khách {CustomerId}: phí ship {ShipFee} VND", customerId, quote.ShipFeeVnd);

            request.Confirm();
            await deliveryRepo.AddAsync(request, innerCt);

            // Tạo vận đơn bên carrier
            var waybillResult = await gateway.CreateWaybillAsync(ctx, innerCt);
            var trackingNo    = waybillResult.TrackingNo;
            var waybill       = DomesticWaybill.Create(request.Id, carrier.Id, trackingNo);
            if (waybillResult.FeeVnd.HasValue)
                waybill.UpdateFromWebhook(DomesticWaybillStatus.Created, waybillResult.FeeVnd);
            await waybillRepo.AddAsync(waybill, innerCt);
            request.MarkShipping();

            // Xuất kho: package → Dispatched + TrackingEvent + notify khách
            foreach (var pkg in packages)
            {
                pkg.TransitionTo(PackageStatus.Dispatched);
                await packageRepo.UpdateAsync(pkg, innerCt);
                await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.OutForDelivery,
                    location: "Đang giao nội địa",
                    note: $"{carrier.Name} — Mã vận đơn {trackingNo}"), innerCt);
            }

            await notifyService.SendOutForDeliveryAsync(customerId, trackingNo, carrier.Name, innerCt);

            logger.LogInformation("DeliveryRequest {Id} created: {Count} packages via {Carrier}, waybill {TrackingNo}",
                request.Id, packages.Count, carrier.Name, trackingNo);

            return MapToResponse(request, carrier.Name, packages, new List<DomesticWaybill> { waybill }, carrier);
        }, ct);
    }

    public async Task<DeliveryRequestResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var request = await deliveryRepo.GetByIdAsync(id, ct)
                      ?? throw new DeliveryRequestNotFoundException(id);
        return await BuildResponseAsync(request, ct);
    }

    public async Task<List<DeliveryRequestResponse>> GetByCustomerAsync(Guid customerId, CancellationToken ct = default)
    {
        var requests = await deliveryRepo.GetByCustomerAsync(customerId, ct);
        var result = new List<DeliveryRequestResponse>(requests.Count);
        foreach (var r in requests)
            result.Add(await BuildResponseAsync(r, ct));
        return result;
    }

    // ── Huỷ yêu cầu (chỉ khi chưa giao cho carrier) ──────────────────────────────
    public async Task<DeliveryRequestResponse> CancelAsync(Guid id, Guid customerId, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var request = await deliveryRepo.GetByIdAsync(id, innerCt)
                          ?? throw new DeliveryRequestNotFoundException(id);
            if (request.CustomerId != customerId)
                throw new DeliveryRequestNotFoundException(id);

            if (request.Status is not (DeliveryRequestStatus.Pending or DeliveryRequestStatus.Confirmed))
                throw new DeliveryNotCancellableException(request.Status.ToString());

            request.Cancel();
            await deliveryRepo.UpdateAsync(request, innerCt);

            // Trả package về kho (nếu đã chuyển Dispatched do flow tạo waybill)
            foreach (var dp in request.Packages)
            {
                var pkg = await packageRepo.GetByIdAsync(dp.PackageId, innerCt);
                if (pkg is { Status: PackageStatus.Dispatched })
                {
                    pkg.TransitionTo(PackageStatus.InVnWarehouse);
                    await packageRepo.UpdateAsync(pkg, innerCt);
                }
            }

            logger.LogInformation("DeliveryRequest {Id} cancelled by customer {CustomerId}", id, customerId);
            return await BuildResponseAsync(request, innerCt);
        }, ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────
    private async Task<DeliveryRequestResponse> BuildResponseAsync(DeliveryRequest request, CancellationToken ct)
    {
        var packages = new List<Package>(request.Packages.Count);
        foreach (var dp in request.Packages)
        {
            var pkg = await packageRepo.GetByIdAsync(dp.PackageId, ct);
            if (pkg is not null) packages.Add(pkg);
        }

        DomesticCarrier? carrier = request.DomesticCarrierId.HasValue
            ? await carrierRepo.GetByIdAsync(request.DomesticCarrierId.Value, ct)
            : null;

        return MapToResponse(request, carrier?.Name, packages, request.Waybills.ToList(), carrier);
    }

    private static DeliveryRequestResponse MapToResponse(DeliveryRequest r, string? carrierName,
        List<Package> packages, List<DomesticWaybill> waybills, DomesticCarrier? carrier) => new(
        Id:                r.Id,
        CustomerId:        r.CustomerId,
        Status:            r.Status.ToString(),
        DeliveryAddressId: r.DeliveryAddressId,
        PreferredTimeSlot: r.PreferredTimeSlot,
        CodAmount:         r.CodAmount,
        ShipFeeVnd:        r.ShipFeeVnd,
        CarrierId:         r.DomesticCarrierId,
        CarrierName:       carrierName,
        Packages: packages.Select(p => new DeliveryPackageItem(p.Id, p.Barcode, p.Status.ToString())).ToList(),
        Waybills: waybills.Select(w => new DeliveryWaybillItem(
            Id:                   w.Id,
            TrackingNo:           w.TrackingNo,
            CarrierName:          carrier?.Name ?? carrierName ?? "",
            Status:               w.Status.ToString(),
            CarrierFeeVnd:        w.CarrierFeeVnd,
            DeliveryAttemptCount: w.DeliveryAttemptCount,
            FailedReason:         w.FailedReason,
            LastStatusAt:         w.LastStatusAt
        )).ToList(),
        CreatedAt: r.CreatedAt,
        UpdatedAt: r.UpdatedAt
    );
}
