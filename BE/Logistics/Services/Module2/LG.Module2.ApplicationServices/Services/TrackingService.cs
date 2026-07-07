using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// UC-2.09 — Nhận webhook từ GHTK/GHN, cập nhật vận đơn + đẩy TrackingEvent cho khách.
public class TrackingService(
    IDomesticWaybillRepository waybillRepo,
    IDomesticCarrierRepository carrierRepo,
    IDeliveryRequestRepository deliveryRepo,
    IPackageRepository         packageRepo,
    ITrackingEventRepository   trackingRepo,
    ICarrierGatewayResolver    gatewayResolver,
    INotificationService       notifyService,
    IModule2UnitOfWork         uow,
    ILogger<TrackingService>   logger
) : ITrackingService
{
    private const int MaxDeliveryAttempts = 2;

    public Task<WebhookResult> ProcessWebhookAsync(string carrierName, CarrierWebhookRequest req, CancellationToken ct = default) =>
        ApplyStatusUpdateAsync(carrierName, req, verifySignature: true, ct);

    // ── Đối soát chủ động (webhook miss — GHTK chỉ retry 1 lần) ──────────────────
    public async Task<WebhookResult> SyncWaybillAsync(string trackingNo, CancellationToken ct = default)
    {
        // Query carrier NGOÀI transaction (HTTP call)
        var waybill = await waybillRepo.GetByTrackingNoAsync(trackingNo, ct)
                      ?? throw new DomesticWaybillNotFoundException(trackingNo);
        var carrier = await carrierRepo.GetByIdAsync(waybill.CarrierId, ct);
        var gateway = gatewayResolver.Resolve(carrier?.Name ?? "");

        var traced = await gateway.GetWaybillStatusAsync(trackingNo, ct);
        if (traced is null)
        {
            logger.LogInformation("Sync {TrackingNo}: carrier không trả trạng thái, giữ nguyên {Status}",
                trackingNo, waybill.Status);
            return new WebhookResult(trackingNo, waybill.Status.ToString(), false, 0);
        }

        // Trạng thái không đổi → không xử lý lại (tránh ghi trùng TrackingEvent/notify)
        if (gateway.MapStatus(traced.RawStatus) == waybill.Status)
            return new WebhookResult(trackingNo, waybill.Status.ToString(), false, 0);

        var req = new CarrierWebhookRequest(trackingNo, traced.RawStatus, traced.FeeVnd, traced.Reason);
        return await ApplyStatusUpdateAsync(carrier?.Name ?? "", req, verifySignature: false, ct);
    }

    // Pipeline chung cho webhook + đối soát: cập nhật waybill, package, tracking, notify.
    private async Task<WebhookResult> ApplyStatusUpdateAsync(string carrierName, CarrierWebhookRequest req,
        bool verifySignature, CancellationToken ct)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var waybill = await waybillRepo.GetByTrackingNoAsync(req.TrackingNo, innerCt)
                          ?? throw new DomesticWaybillNotFoundException(req.TrackingNo);

            var carrier = await carrierRepo.GetByIdAsync(waybill.CarrierId, innerCt);
            var gateway = gatewayResolver.Resolve(carrierName);

            // Xác thực webhook theo secret của carrier (bỏ qua khi đối soát chủ động — mình gọi carrier)
            if (verifySignature && !gateway.VerifySignature(carrier?.WebhookSecret, req))
                throw new InvalidWebhookSignatureException(carrierName);

            var newStatus = gateway.MapStatus(req.Status);
            waybill.UpdateFromWebhook(newStatus, req.FeeVnd, req.Reason);
            await waybillRepo.UpdateAsync(waybill, innerCt);

            var request  = await deliveryRepo.GetByIdAsync(waybill.DeliveryRequestId, innerCt);
            var packages = new List<Package>();
            if (request is not null)
            {
                foreach (var dp in request.Packages)
                {
                    var pkg = await packageRepo.GetByIdAsync(dp.PackageId, innerCt);
                    if (pkg is not null) packages.Add(pkg);
                }
            }

            var affected = 0;
            switch (newStatus)
            {
                case DomesticWaybillStatus.Delivered:
                    foreach (var pkg in packages.Where(p => p.Status == PackageStatus.Dispatched))
                    {
                        pkg.TransitionTo(PackageStatus.Delivered);
                        await packageRepo.UpdateAsync(pkg, innerCt);
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.Delivered,
                            location: "Đã giao tới khách", note: $"Mã vận đơn {waybill.TrackingNo}"), innerCt);
                        affected++;
                    }
                    request?.MarkDelivered();
                    if (request is not null)
                        await notifyService.SendDeliveredAsync(request.CustomerId, waybill.TrackingNo, innerCt);
                    break;

                case DomesticWaybillStatus.DeliveryFailed:
                    foreach (var pkg in packages)
                    {
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.DeliveryFailed,
                            note: $"Giao thất bại lần {waybill.DeliveryAttemptCount}: {req.Reason}"), innerCt);
                        affected++;
                    }
                    if (waybill.DeliveryAttemptCount > MaxDeliveryAttempts)
                    {
                        request?.MarkFailed();
                        await notifyService.SendDeliveryFailedAlertAsync(
                            waybill.TrackingNo, waybill.DeliveryAttemptCount, req.Reason, innerCt);
                    }
                    break;

                case DomesticWaybillStatus.Returned:
                    foreach (var pkg in packages.Where(p => p.Status == PackageStatus.Dispatched))
                    {
                        pkg.TransitionTo(PackageStatus.Returned);
                        await packageRepo.UpdateAsync(pkg, innerCt);
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.Exception,
                            note: $"Hoàn hàng — Mã vận đơn {waybill.TrackingNo}"), innerCt);
                        affected++;
                    }
                    break;

                case DomesticWaybillStatus.PickedUp:
                case DomesticWaybillStatus.InTransit:
                case DomesticWaybillStatus.OutForDelivery:
                    foreach (var pkg in packages)
                    {
                        await trackingRepo.AddAsync(TrackingEvent.Record(pkg.Id, TrackingEventType.OutForDelivery,
                            note: $"Vận đơn {waybill.TrackingNo}: {newStatus}"), innerCt);
                        affected++;
                    }
                    break;
            }

            if (request is not null) await deliveryRepo.UpdateAsync(request, innerCt);

            logger.LogInformation("Webhook {Carrier} {TrackingNo} → {Status}, affected {Count} packages",
                carrierName, req.TrackingNo, newStatus, affected);

            return new WebhookResult(req.TrackingNo, newStatus.ToString(), true, affected);
        }, ct);
    }
}
