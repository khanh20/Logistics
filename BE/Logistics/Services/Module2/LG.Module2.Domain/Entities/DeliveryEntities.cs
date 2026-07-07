using LG.Module2.Domain.Exceptions;

namespace LG.Module2.Domain.Entities;

// ── DeliveryRequestStatus ─────────────────────────────────────────────────────
public enum DeliveryRequestStatus
{
    Pending    = 1,   // Chờ xử lý
    Confirmed  = 2,   // Đã xác nhận, chờ tạo vận đơn
    Shipping   = 3,   // Đã có vận đơn nội địa
    Delivered  = 4,   // Giao thành công
    Failed     = 5,   // Giao thất bại sau nhiều lần thử
    Cancelled  = 6,
}

// ── DeliveryRequest ───────────────────────────────────────────────────────────
public class DeliveryRequest
{
    public Guid                  Id                { get; private set; } = Guid.NewGuid();
    public Guid                  CustomerId        { get; private set; }
    public DeliveryRequestStatus Status            { get; private set; } = DeliveryRequestStatus.Pending;
    public Guid                  DeliveryAddressId { get; private set; }
    public string?               PreferredTimeSlot { get; private set; }
    public decimal?              CodAmount         { get; private set; }   // Thu hộ (COD) nếu có
    public decimal?              ShipFeeVnd        { get; private set; }   // Phí ship nội địa (trừ ví)
    public Guid?                 DomesticCarrierId { get; private set; }
    public DateTime              CreatedAt         { get; private set; } = DateTime.UtcNow;
    public DateTime              UpdatedAt         { get; private set; } = DateTime.UtcNow;

    public ICollection<DeliveryPackage>  Packages      { get; private set; } = new List<DeliveryPackage>();
    public ICollection<DomesticWaybill>  Waybills      { get; private set; } = new List<DomesticWaybill>();

    private DeliveryRequest() { }

    public static DeliveryRequest Create(Guid customerId, Guid deliveryAddressId,
                                          string? preferredTimeSlot = null, decimal? codAmount = null) =>
        new()
        {
            CustomerId        = customerId,
            DeliveryAddressId = deliveryAddressId,
            PreferredTimeSlot = preferredTimeSlot?.Trim(),
            CodAmount         = codAmount,
        };

    public void SetShipFee(decimal shipFeeVnd, Guid carrierId)
    {
        ShipFeeVnd        = shipFeeVnd;
        DomesticCarrierId = carrierId;
        Touch();
    }

    public void Confirm()
    {
        Status = DeliveryRequestStatus.Confirmed;
        Touch();
    }

    public void MarkShipping()
    {
        Status = DeliveryRequestStatus.Shipping;
        Touch();
    }

    public void MarkDelivered()
    {
        Status = DeliveryRequestStatus.Delivered;
        Touch();
    }

    public void MarkFailed()
    {
        Status = DeliveryRequestStatus.Failed;
        Touch();
    }

    public void Cancel()
    {
        Status = DeliveryRequestStatus.Cancelled;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── DeliveryPackage ───────────────────────────────────────────────────────────
public class DeliveryPackage
{
    public Guid Id                { get; private set; } = Guid.NewGuid();
    public Guid DeliveryRequestId { get; private set; }
    public Guid PackageId         { get; private set; }

    public DeliveryRequest DeliveryRequest { get; private set; } = default!;
    public Package         Package         { get; private set; } = default!;

    private DeliveryPackage() { }

    public static DeliveryPackage Create(Guid deliveryRequestId, Guid packageId) =>
        new() { DeliveryRequestId = deliveryRequestId, PackageId = packageId };
}

// ── DomesticCarrier ───────────────────────────────────────────────────────────
public class DomesticCarrier
{
    public Guid    Id              { get; private set; } = Guid.NewGuid();
    public string  Name            { get; private set; } = default!;  // GHTK, GHN, Viettel Post, J&T
    public string  ApiEndpoint     { get; private set; } = default!;
    public string? WebhookSecret   { get; private set; }
    public decimal MaxWeightKg     { get; private set; }
    public decimal MaxValueVnd     { get; private set; }
    public bool    IsActive        { get; private set; } = true;
    public DateTime CreatedAt      { get; private set; } = DateTime.UtcNow;

    private DomesticCarrier() { }

    public static DomesticCarrier Create(string name, string apiEndpoint, decimal maxWeightKg,
                                          decimal maxValueVnd, string? webhookSecret = null) =>
        new()
        {
            Name          = name.Trim(),
            ApiEndpoint   = apiEndpoint.Trim(),
            WebhookSecret = webhookSecret,
            MaxWeightKg   = maxWeightKg,
            MaxValueVnd   = maxValueVnd,
        };

    public void Deactivate() => IsActive = false;
}

// ── DomesticWaybillStatus ─────────────────────────────────────────────────────
public enum DomesticWaybillStatus
{
    Created         = 1,
    PickedUp        = 2,
    InTransit       = 3,
    OutForDelivery  = 4,
    Delivered       = 5,
    DeliveryFailed  = 6,
    Returned        = 7,
    Cancelled       = 8,
}

// ── DomesticWaybill ───────────────────────────────────────────────────────────
public class DomesticWaybill
{
    public Guid                   Id                    { get; private set; } = Guid.NewGuid();
    public Guid                   DeliveryRequestId     { get; private set; }
    public Guid                   CarrierId             { get; private set; }
    public string                 TrackingNo            { get; private set; } = default!;  // Mã carrier cấp
    public DomesticWaybillStatus  Status                { get; private set; } = DomesticWaybillStatus.Created;
    public decimal?               CarrierFeeVnd         { get; private set; }   // Phí thực tế carrier báo về
    public int                    DeliveryAttemptCount  { get; private set; }
    public string?                FailedReason          { get; private set; }
    public DateTime?              LastStatusAt          { get; private set; }
    public DateTime               CreatedAt             { get; private set; } = DateTime.UtcNow;

    public DeliveryRequest DeliveryRequest { get; private set; } = default!;
    public DomesticCarrier Carrier         { get; private set; } = default!;

    private DomesticWaybill() { }

    public static DomesticWaybill Create(Guid deliveryRequestId, Guid carrierId, string trackingNo) =>
        new()
        {
            DeliveryRequestId = deliveryRequestId,
            CarrierId         = carrierId,
            TrackingNo        = trackingNo.Trim(),
        };

    public void Cancel()
    {
        Status       = DomesticWaybillStatus.Cancelled;
        LastStatusAt = DateTime.UtcNow;
    }

    public void SetCarrierFee(decimal? fee)
    {
        if (!fee.HasValue) return;
        CarrierFeeVnd = fee;
        LastStatusAt  = DateTime.UtcNow;
    }

    /// Webhook có thể đến trùng (carrier retry) hoặc đến trễ (sau trạng thái mới hơn) —
    /// chỉ nhận cập nhật "tiến lên":
    /// - Trạng thái kết thúc (Delivered/Returned/Cancelled) không thay đổi được nữa
    /// - Trùng trạng thái → bỏ qua, trừ DeliveryFailed (mỗi webhook failed = 1 lần thử mới)
    /// - Pha tuyến tính Created→PickedUp→InTransit→OutForDelivery không đi lùi;
    ///   riêng từ DeliveryFailed được quay lại InTransit/OutForDelivery (hoãn giao → giao lại)
    public bool CanApplyStatus(DomesticWaybillStatus newStatus)
    {
        if (Status is DomesticWaybillStatus.Delivered
                   or DomesticWaybillStatus.Returned
                   or DomesticWaybillStatus.Cancelled)
            return false;

        if (Status == DomesticWaybillStatus.DeliveryFailed)
            return newStatus is not (DomesticWaybillStatus.Created or DomesticWaybillStatus.PickedUp);

        return Rank(newStatus) > Rank(Status);
    }

    private static int Rank(DomesticWaybillStatus s) => s switch
    {
        DomesticWaybillStatus.Created        => 1,
        DomesticWaybillStatus.PickedUp       => 2,
        DomesticWaybillStatus.InTransit      => 3,
        DomesticWaybillStatus.OutForDelivery => 4,
        DomesticWaybillStatus.DeliveryFailed => 5,
        _                                    => 6,   // Delivered / Returned / Cancelled
    };

    /// Áp dụng trạng thái từ webhook/đối soát. false = bị bỏ qua (trùng hoặc đi lùi).
    public bool UpdateFromWebhook(DomesticWaybillStatus newStatus, decimal? carrierFee = null,
                                   string? failedReason = null)
    {
        if (!CanApplyStatus(newStatus)) return false;

        Status       = newStatus;
        CarrierFeeVnd = carrierFee ?? CarrierFeeVnd;
        FailedReason  = failedReason;
        LastStatusAt  = DateTime.UtcNow;

        if (newStatus == DomesticWaybillStatus.DeliveryFailed)
            DeliveryAttemptCount++;
        return true;
    }
}
