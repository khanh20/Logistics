namespace LG.Module1.Domain.Adapters;

/// DTO trạng thái shipment trả về từ Module 2.
public record ShipmentStatusDto(
    string ShipmentCode,
    string Status,         // "InTransit" | "Delivered" | "Failed"
    string? Location,
    DateTime? UpdatedAt
);

/// Interface kết nối sang Module 2 — Logistics.
/// Phase 9 dùng stub. Module 2 sẽ implement thực qua HTTP khi sẵn sàng.
public interface ILogisticsService
{
    /// Tạo shipment bên Module 2 sau khi staff xác nhận đã đặt hàng trên sàn.
    /// Trả về shipment code từ Module 2.
    Task<string> CreateShipmentAsync(Guid customerOrderId, string trackingCode,
                                      CancellationToken ct = default);

    /// Lấy trạng thái vận chuyển hiện tại từ Module 2.
    Task<ShipmentStatusDto> GetShipmentStatusAsync(Guid customerOrderId,
                                                    CancellationToken ct = default);
}
