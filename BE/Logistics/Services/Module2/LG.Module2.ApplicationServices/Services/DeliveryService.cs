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
    IWalletService             walletService,
    INotificationService       notifyService,
    IModule2UnitOfWork         uow,
    ILogger<DeliveryService>   logger
) : IDeliveryService
{
    // ── UC-2.08: Khách tạo yêu cầu giao nội địa ──────────────────────────────────
    // HTTP call carrier nằm NGOÀI transaction: Tx1 chốt request (PartnerOrderCode ổn định
    // để idempotency) → gọi carrier → Tx2 waybill + xuất kho. Fail giữa chừng → compensation
    // huỷ đơn carrier theo partner code + huỷ request.
    public async Task<DeliveryRequestResponse> CreateAsync(Guid customerId, CreateDeliveryRequest req, CancellationToken ct = default)
    {
        if (req.PackageIds is null || req.PackageIds.Count == 0)
            throw new EmptyDeliveryRequestException();

        // Validate (chỉ đọc, chưa cần transaction)
        var carrier = await carrierRepo.GetByIdAsync(req.CarrierId, ct)
                      ?? throw new DomesticCarrierNotFoundException(req.CarrierId);
        if (!carrier.IsActive)
            throw new CarrierInactiveException(carrier.Name);

        var packages = new List<Package>();
        decimal totalWeight = 0m;
        decimal totalValue  = 0m;
        foreach (var pid in req.PackageIds.Distinct())
        {
            var pkg = await packageRepo.GetByIdAsync(pid, ct)
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

        // Báo giá phí ship qua carrier (HTTP, không side-effect)
        var quote = await gateway.QuoteAsync(ctx, ct);
        request.SetShipFee(quote.ShipFeeVnd, carrier.Id);

        request.Confirm();

        // Tx1: chốt request vào DB trước khi gọi carrier — nếu bước sau fail vẫn còn
        // dấu vết để đối soát/huỷ theo PartnerOrderCode
        await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            await deliveryRepo.AddAsync(request, innerCt);
        }, ct);

        // Trừ ví khách (Core Finance) — trước khi tạo đơn carrier: thiếu số dư thì
        // không có đơn GHTK nào được tạo, chỉ cần huỷ request trong DB.
        try
        {
            await walletService.DeductAsync(customerId, quote.ShipFeeVnd, "DeliveryRequest", request.Id,
                $"Phí giao nội địa {carrier.Name} — yêu cầu {request.Id:N}", ct);
        }
        catch
        {
            await CompensateFailedCreateAsync(request, gateway, refundWallet: false);
            throw;
        }

        // HTTP: tạo vận đơn bên carrier (idempotent theo PartnerOrderCode)
        CarrierWaybillResult waybillResult;
        try
        {
            waybillResult = await gateway.CreateWaybillAsync(ctx, ct);
        }
        catch
        {
            await CompensateFailedCreateAsync(request, gateway, refundWallet: true);
            throw;
        }

        try
        {
            // Tx2: ghi waybill + xuất kho + tracking + notify
            return await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                var trackingNo = waybillResult.TrackingNo;
                var waybill    = DomesticWaybill.Create(request.Id, carrier.Id, trackingNo);
                waybill.SetCarrierFee(waybillResult.FeeVnd);
                await waybillRepo.AddAsync(waybill, innerCt);

                request.MarkShipping();
                await deliveryRepo.UpdateAsync(request, innerCt);

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
        catch
        {
            await CompensateFailedCreateAsync(request, gateway, refundWallet: true);
            throw;
        }
    }

    // Compensation khi tạo đơn fail giữa chừng: huỷ đơn carrier theo partner code (best-effort,
    // idempotent — chưa tạo thì carrier trả false vô hại) + hoàn ví (nếu đã trừ) + request → Cancelled.
    // Dùng CancellationToken.None: phải chạy trọn vẹn kể cả khi request gốc đã bị cancel/timeout.
    private async Task CompensateFailedCreateAsync(DeliveryRequest request, ICarrierGateway gateway, bool refundWallet)
    {
        var partnerCode = request.Id.ToString("N");
        try
        {
            await gateway.CancelByPartnerCodeAsync(partnerCode, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Compensation: không huỷ được đơn carrier partner code {PartnerCode} — cần đối soát tay", partnerCode);
        }

        if (refundWallet && request.ShipFeeVnd is > 0m)
        {
            try
            {
                await walletService.RefundAsync(request.CustomerId, request.ShipFeeVnd.Value,
                    "DeliveryRequest", request.Id,
                    $"Hoàn phí ship — tạo yêu cầu giao {request.Id:N} thất bại", CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Compensation: không hoàn được {Amount} VND ví khách {CustomerId} (request {Id}) — cần đối soát tay",
                    request.ShipFeeVnd, request.CustomerId, request.Id);
            }
        }

        try
        {
            await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                request.Cancel();
                await deliveryRepo.UpdateAsync(request, innerCt);
            }, CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Compensation: không huỷ được DeliveryRequest {Id} trong DB — cần đối soát tay", request.Id);
        }
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

    // ── Huỷ yêu cầu (trước khi carrier lấy hàng) ─────────────────────────────────
    // Huỷ được khi: chưa có vận đơn (Pending/Confirmed), hoặc đã có vận đơn (Shipping)
    // nhưng mọi vận đơn còn ở Created (carrier chưa lấy hàng) — khi đó huỷ trên carrier trước.
    public async Task<DeliveryRequestResponse> CancelAsync(Guid id, Guid customerId, CancellationToken ct = default)
    {
        var request = await deliveryRepo.GetByIdAsync(id, ct)
                      ?? throw new DeliveryRequestNotFoundException(id);
        if (request.CustomerId != customerId)
            throw new DeliveryRequestNotFoundException(id);

        var activeWaybills = request.Waybills
            .Where(w => w.Status != DomesticWaybillStatus.Cancelled)
            .ToList();

        var cancellable = request.Status is DeliveryRequestStatus.Pending or DeliveryRequestStatus.Confirmed
                          || (request.Status == DeliveryRequestStatus.Shipping
                              && activeWaybills.All(w => w.Status == DomesticWaybillStatus.Created));
        if (!cancellable)
            throw new DeliveryNotCancellableException(request.Status.ToString());

        // Huỷ trên carrier TRƯỚC khi đụng DB — không giữ transaction qua HTTP call.
        // Nếu DB fail sau đó: đơn đã huỷ bên carrier nhưng DB còn active → đối soát bù (A2),
        // an toàn hơn chiều ngược lại (DB huỷ mà carrier vẫn giao).
        if (activeWaybills.Count > 0 && request.DomesticCarrierId.HasValue)
        {
            var carrier = await carrierRepo.GetByIdAsync(request.DomesticCarrierId.Value, ct)
                          ?? throw new DomesticCarrierNotFoundException(request.DomesticCarrierId.Value);
            var gateway = gatewayResolver.Resolve(carrier.Name);
            foreach (var waybill in activeWaybills)
            {
                if (!await gateway.CancelWaybillAsync(waybill.TrackingNo, ct))
                    throw new CarrierCancelFailedException(waybill.TrackingNo);
            }
        }

        var response = await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            request.Cancel();
            foreach (var waybill in activeWaybills)
            {
                waybill.Cancel();
                await waybillRepo.UpdateAsync(waybill, innerCt);
            }
            await deliveryRepo.UpdateAsync(request, innerCt);

            // Trả package về kho (đã chuyển Dispatched trong flow tạo waybill)
            foreach (var dp in request.Packages)
            {
                var pkg = await packageRepo.GetByIdAsync(dp.PackageId, innerCt);
                if (pkg is { Status: PackageStatus.Dispatched })
                {
                    pkg.TransitionTo(PackageStatus.InVnWarehouse);
                    await packageRepo.UpdateAsync(pkg, innerCt);
                    await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.VnWarehouseIn,
                        location: "Kho VN",
                        note: "Khách huỷ yêu cầu giao — kiện trả về kho"), innerCt);
                }
            }

            logger.LogInformation("DeliveryRequest {Id} cancelled by customer {CustomerId} ({WaybillCount} waybill huỷ trên carrier)",
                id, customerId, activeWaybills.Count);
            return await BuildResponseAsync(request, innerCt);
        }, ct);

        // Hoàn phí ship về ví — sau khi huỷ đã chốt trong DB. Best-effort: fail thì log ERROR
        // để đối soát tay (qua Core FinanceManagement), không rollback việc huỷ.
        if (request.ShipFeeVnd is > 0m)
        {
            try
            {
                await walletService.RefundAsync(customerId, request.ShipFeeVnd.Value,
                    "DeliveryRequest", request.Id,
                    $"Hoàn phí ship — khách huỷ yêu cầu giao {request.Id:N}", CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Không hoàn được {Amount} VND phí ship cho khách {CustomerId} (request {Id} đã huỷ) — cần đối soát tay",
                    request.ShipFeeVnd, customerId, request.Id);
            }
        }

        return response;
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
