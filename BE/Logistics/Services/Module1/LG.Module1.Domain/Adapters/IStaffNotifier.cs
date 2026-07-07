using LG.Module1.Domain.Entities;

namespace LG.Module1.Domain.Adapters;

/// Port gửi thông báo in-app cho NV. Impl hiện ghi vào StaffNotification (DB);
/// có thể mở rộng push/email sau mà không đổi caller.
public interface IStaffNotifier
{
    Task NotifyAsync(Guid staffId, StaffNotificationType type, string title, string body,
                     Guid? refOrderId = null, CancellationToken ct = default);
}
