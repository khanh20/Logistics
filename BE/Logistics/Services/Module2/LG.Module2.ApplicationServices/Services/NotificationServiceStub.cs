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
}
