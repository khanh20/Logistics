namespace LG.Module1.Domain.Adapters;

/// Thông tin nhân thân NV lấy từ Auth service (cross-module, read-only).
public record StaffDirectoryEntry(Guid Id, string FullName, string Email, string Status);

/// Resolve Id → tên/email NV. Module 1 KHÔNG sở hữu User nên gọi sang Auth.
public interface IStaffDirectoryService
{
    /// Lấy thông tin nhiều NV theo danh sách Id. Id không tồn tại sẽ bị bỏ qua.
    Task<IReadOnlyDictionary<Guid, StaffDirectoryEntry>> ResolveAsync(
        IEnumerable<Guid> ids, CancellationToken ct = default);

    /// Lấy danh sách NV theo role (vd "NV_MuaHang") kèm tên/email.
    Task<IReadOnlyList<StaffDirectoryEntry>> GetByRoleAsync(
        string role, bool activeOnly = true, CancellationToken ct = default);
}
