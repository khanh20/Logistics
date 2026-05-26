namespace LG.Module1.Domain.Adapters;

/// Interface lấy danh sách nhân viên đang active để auto-assign đơn.
public interface IStaffRosterService
{
    /// Trả về danh sách staffId đang available (online, không nghỉ phép).
    Task<IReadOnlyList<Guid>> GetAvailableStaffAsync(CancellationToken ct = default);
}
