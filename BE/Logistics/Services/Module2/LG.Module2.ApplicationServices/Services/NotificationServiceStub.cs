using LG.Module2.ApplicationServices.Interfaces;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

/// Stub — Phase 6 sẽ tích hợp Zalo OA + Firebase push notification.
public class NotificationServiceStub(ILogger<NotificationServiceStub> logger) : INotificationService
{
    public Task SendPackageArrivedVnAsync(Guid customerId, string barcode, string orderCode, CancellationToken ct = default)
    {
        logger.LogInformation("[NOTIFY-STUB] Package {Barcode} (Order {OrderCode}) arrived VN → customer {CustomerId}",
            barcode, orderCode, customerId);
        return Task.CompletedTask;
    }

    public Task SendWeightVarianceAlertAsync(Guid staffId, string barcode, decimal variancePct, CancellationToken ct = default)
    {
        logger.LogWarning("[NOTIFY-STUB] Weight variance {VariancePct:P1} on package {Barcode} → staff {StaffId}",
            variancePct, barcode, staffId);
        return Task.CompletedTask;
    }

    public Task SendCustomsHeldAlertAsync(Guid customerId, string barcode, string reason, CancellationToken ct = default)
    {
        logger.LogWarning("[NOTIFY-STUB] Package {Barcode} held at customs ({Reason}) → customer {CustomerId}",
            barcode, reason, customerId);
        return Task.CompletedTask;
    }

    public Task SendOutForDeliveryAsync(Guid customerId, string trackingNo, string carrierName, CancellationToken ct = default)
    {
        logger.LogInformation("[NOTIFY-STUB] Out for delivery {TrackingNo} via {Carrier} → customer {CustomerId}",
            trackingNo, carrierName, customerId);
        return Task.CompletedTask;
    }

    public Task SendDeliveredAsync(Guid customerId, string trackingNo, CancellationToken ct = default)
    {
        logger.LogInformation("[NOTIFY-STUB] Delivered {TrackingNo} → customer {CustomerId}", trackingNo, customerId);
        return Task.CompletedTask;
    }

    public Task SendDeliveryFailedAlertAsync(string trackingNo, int attemptCount, string? reason, CancellationToken ct = default)
    {
        logger.LogWarning("[NOTIFY-STUB] Delivery failed {TrackingNo} (attempt {Attempt}): {Reason} → CSKH",
            trackingNo, attemptCount, reason);
        return Task.CompletedTask;
    }

    public Task SendClaimResolvedAsync(Guid customerId, string claimType, string outcome, CancellationToken ct = default)
    {
        logger.LogInformation("[NOTIFY-STUB] {ClaimType} resolved ({Outcome}) → customer {CustomerId}",
            claimType, outcome, customerId);
        return Task.CompletedTask;
    }

    public Task SendRefundIssuedAsync(Guid customerId, decimal amountVnd, string reason, CancellationToken ct = default)
    {
        logger.LogInformation("[NOTIFY-STUB] Refund {Amount} VND ({Reason}) → customer {CustomerId}",
            amountVnd, reason, customerId);
        return Task.CompletedTask;
    }
}
