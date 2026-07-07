namespace LG.Module2.ApplicationServices.DTOs.Delivery;

// ── Requests ──────────────────────────────────────────────────────────────────
public record CreateDeliveryRequest(
    List<Guid> PackageIds,
    Guid       CarrierId,
    Guid       DeliveryAddressId,
    // Thông tin người nhận + địa chỉ (bắt buộc để tạo vận đơn carrier như GHTK)
    string     RecipientName,
    string     RecipientTel,
    string     Province,
    string     District,
    string     Ward,
    string     Address,
    string?    PreferredTimeSlot = null,
    decimal?   CodAmount         = null
);

/// Địa chỉ từ sổ địa chỉ Core Finance. Sổ chỉ lưu MÃ tỉnh/huyện/xã (không có tên chữ)
/// nên tên khu vực cho carrier vẫn lấy từ body request.
public record CustomerAddressInfo(
    Guid    Id,
    string  RecipientName,
    string  Phone,
    string  AddressLine
);

/// Payload chuẩn hoá từ webhook carrier (GHTK/GHN). `Status` là mã trạng thái raw của carrier.
public record CarrierWebhookRequest(
    string   TrackingNo,
    string   Status,
    decimal? FeeVnd       = null,
    string?  Reason       = null,
    string?  Signature    = null
);

// ── Responses ─────────────────────────────────────────────────────────────────
public record DeliveryRequestResponse(
    Guid     Id,
    Guid     CustomerId,
    string   Status,
    Guid     DeliveryAddressId,
    string?  PreferredTimeSlot,
    decimal? CodAmount,
    decimal? ShipFeeVnd,
    Guid?    CarrierId,
    string?  CarrierName,
    List<DeliveryPackageItem> Packages,
    List<DeliveryWaybillItem> Waybills,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record DeliveryPackageItem(
    Guid    PackageId,
    string  Barcode,
    string  Status
);

public record DeliveryWaybillItem(
    Guid     Id,
    string   TrackingNo,
    string   CarrierName,
    string   Status,
    decimal? CarrierFeeVnd,
    int      DeliveryAttemptCount,
    string?  FailedReason,
    DateTime? LastStatusAt
);

public record WebhookResult(
    string  TrackingNo,
    string  NewStatus,
    bool    Processed,
    int     AffectedPackages
);
