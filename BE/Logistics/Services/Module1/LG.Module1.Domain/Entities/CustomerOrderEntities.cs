using LG.Module1.Domain.Exceptions;

namespace LG.Module1.Domain.Entities;

// ── OrderStatus ───────────────────────────────────────────────────────────────
public enum OrderStatus
{
    PendingPayment      = 1,    // Vừa tạo, chờ khách đóng cọc (TTL 30 phút)
    Paid                = 2,    // Đã đóng đủ cọc
    AwaitingApiPlace    = 3,    // Đang chờ job tự đặt qua ShopApi
    AwaitingManualPlace = 4,    // Chờ NV đặt thủ công trên web sàn
    OrderedOnPlatform   = 5,    // Đã có mã đơn sàn
    ShippedFromShop     = 6,    // Có tracking number, shop đã ship
    ArrivedChinaWh      = 7,    // Kho TQ nhận hàng
    ShippingToVN        = 8,    // Đang vận chuyển quốc tế về VN
    ArrivedVietnam      = 9,    // Kho VN nhận hàng
    Delivering          = 10,   // Đang giao tới tay khách
    Completed           = 11,   // Giao thành công

    CancelledByTimeout  = 90,   // Hết 30 phút chưa đóng cọc — system auto
    CancelledByCustomer = 91,   // Khách chủ động hủy
    CancelledByStaff    = 92,   // NV hủy (không đặt được sàn)
    Returned            = 93,   // Khách trả hàng sau khi nhận
}

public enum PlacementMode { Manual = 1, AutoApi = 2 }

// ── CustomerOrder ─────────────────────────────────────────────────────────────
public class CustomerOrder
{
    public Guid   Id            { get; private set; } = Guid.NewGuid();
    public string OrderCode     { get; private set; } = default!;
    public Guid   CustomerId    { get; private set; }
    public Guid   ShopId        { get; private set; }
    /// Denormalized — giữ nguyên ngay cả khi shop đổi tên sau này.
    public string ShopName      { get; private set; } = default!;

    public OrderStatus   Status        { get; private set; } = OrderStatus.PendingPayment;
    public PlacementMode PlacementMode { get; private set; } = PlacementMode.Manual;

    // ── Pricing (khóa tại thời điểm checkout) ────────────────────────────────
    /// Tổng giá gốc CNY (sum of items).
    public decimal TotalCny        { get; private set; }
    /// Tỉ giá VND/CNY lúc checkout — khóa không đổi.
    public decimal RateVndPerCny   { get; private set; }
    /// = TotalCny * RateVndPerCny
    public decimal FinalAmountVnd  { get; private set; }
    /// Tỉ lệ cọc (0.0 – 1.0), VD: 0.65
    public decimal DepositPct      { get; private set; }
    /// = FinalAmountVnd * DepositPct
    public decimal DepositVnd      { get; private set; }

    public bool IsDepositPaid { get; private set; }
    public bool IsFinalPaid   { get; private set; }

    // ── Notes ─────────────────────────────────────────────────────────────────
    public string? DeliveryAddressNote { get; private set; }
    public string? CustomerNote        { get; private set; }
    public string? StaffNote           { get; private set; }
    public string? CancelReason        { get; private set; }

    // ── Assignment & Timestamps ───────────────────────────────────────────────
    public Guid?    AssignedStaffId { get; private set; }
    public DateTime CreatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime UpdatedAt       { get; private set; } = DateTime.UtcNow;
    /// Deadline đóng cọc = CreatedAt + 30 min
    public DateTime PaymentDeadline { get; private set; }
    public DateTime? PaidAt         { get; private set; }
    public DateTime? CompletedAt    { get; private set; }
    public DateTime? CancelledAt    { get; private set; }

    // Navigation
    public PlatformShop                   Shop          { get; private set; } = default!;
    public PlatformOrder?                 PlatformOrder { get; private set; }
    public ICollection<OrderItem>         Items         { get; private set; } = new List<OrderItem>();
    public ICollection<OrderStatusHistory> History      { get; private set; } = new List<OrderStatusHistory>();
    public ICollection<OrderFeeDetail>    Fees          { get; private set; } = new List<OrderFeeDetail>();

    private CustomerOrder() { }

    // ── Factory ───────────────────────────────────────────────────────────────
    public static CustomerOrder Create(
        Guid         customerId,
        Guid         shopId,
        string       shopName,
        decimal      rateVndPerCny,
        decimal      depositPct,
        PlacementMode placementMode,
        string?      deliveryAddressNote = null,
        string?      customerNote = null)
    {
        var order = new CustomerOrder
        {
            OrderCode           = GenerateCode(),
            CustomerId          = customerId,
            ShopId              = shopId,
            ShopName            = shopName.Trim(),
            RateVndPerCny       = rateVndPerCny,
            DepositPct          = depositPct,
            PlacementMode       = placementMode,
            DeliveryAddressNote = deliveryAddressNote?.Trim(),
            CustomerNote        = customerNote?.Trim(),
            PaymentDeadline     = DateTime.UtcNow.AddMinutes(30),
        };
        order.AppendHistory(null, OrderStatus.PendingPayment, null, "Đơn hàng được tạo từ checkout");
        return order;
    }

    /// Thêm item vào đơn hàng (chỉ gọi trước CalculateDeposit).
    public void AddItem(Guid variantId, string productTitle, string? variantName,
                        string? imageUrl, int quantity, decimal unitPriceCny)
    {
        if (quantity <= 0) throw new InvalidQuantityException(quantity);
        var item = OrderItem.Create(Id, variantId, productTitle, variantName, imageUrl, quantity, unitPriceCny);
        Items.Add(item);
        TotalCny += item.TotalCny;
    }

    /// Tính DepositVnd + FinalAmountVnd sau khi đã add xong items.
    public void CalculateDeposit()
    {
        FinalAmountVnd = Math.Round(TotalCny * RateVndPerCny, 0);
        DepositVnd     = Math.Round(FinalAmountVnd * DepositPct, 0);
    }

    /// Gắn PlatformOrder sau khi tạo (dùng khi ghi nhận đặt hàng thủ công).
    public void AttachPlatformOrder(PlatformOrder po)
    {
        PlatformOrder = po;
        Touch();
    }

    // ── State machine ─────────────────────────────────────────────────────────

    public void MarkPaid()
    {
        TransitionTo(OrderStatus.Paid, null, "Đã đóng cọc");
        IsDepositPaid = true;
        PaidAt        = DateTime.UtcNow;
    }

    /// Route theo IntegrationMode của shop.
    public void AssignToStaff(Guid staffId, ShopIntegrationMode integrationMode)
    {
        AssignedStaffId = staffId;
        var next = integrationMode == ShopIntegrationMode.ShopifyAuto
            ? OrderStatus.AwaitingApiPlace
            : OrderStatus.AwaitingManualPlace;
        TransitionTo(next, staffId, "Đã phân công NV");
    }

    public void MarkOrderedOnPlatform(Guid changedBy, string? note = null) =>
        TransitionTo(OrderStatus.OrderedOnPlatform, changedBy, note ?? "Đã đặt trên sàn");

    public void MarkShippedFromShop(Guid changedBy, string? note = null) =>
        TransitionTo(OrderStatus.ShippedFromShop, changedBy, note ?? "Shop đã ship hàng");

    public void MarkArrivedChinaWh(Guid? changedBy = null, string? note = null) =>
        TransitionTo(OrderStatus.ArrivedChinaWh, changedBy, note ?? "Hàng đến kho TQ");

    public void MarkShippingToVN(Guid? changedBy = null, string? note = null) =>
        TransitionTo(OrderStatus.ShippingToVN, changedBy, note ?? "Đang ship về VN");

    public void MarkArrivedVietnam(Guid? changedBy = null, string? note = null) =>
        TransitionTo(OrderStatus.ArrivedVietnam, changedBy, note ?? "Hàng về kho VN");

    public void MarkDelivering(Guid changedBy, string? note = null) =>
        TransitionTo(OrderStatus.Delivering, changedBy, note ?? "Đang giao hàng");

    public void MarkCompleted(Guid? changedBy = null, string? note = null)
    {
        TransitionTo(OrderStatus.Completed, changedBy, note ?? "Giao hàng thành công");
        CompletedAt  = DateTime.UtcNow;
        IsFinalPaid  = true;
    }

    public void MarkReturned(Guid? changedBy = null, string? note = null) =>
        TransitionTo(OrderStatus.Returned, changedBy, note ?? "Khách trả hàng");

    public void CancelByTimeout()
    {
        CancelReason = "Hết 30 phút đóng cọc — tự động hủy.";
        CancelledAt  = DateTime.UtcNow;
        TransitionTo(OrderStatus.CancelledByTimeout, null, CancelReason);
    }

    public void CancelByCustomer(string reason)
    {
        if (!CanCustomerCancel())
            throw new InvalidOrderTransitionException(Status.ToString(), OrderStatus.CancelledByCustomer.ToString());
        CancelReason = reason.Trim();
        CancelledAt  = DateTime.UtcNow;
        TransitionTo(OrderStatus.CancelledByCustomer, CustomerId, reason);
    }

    public void CancelByStaff(Guid staffId, string reason)
    {
        CancelReason = reason.Trim();
        CancelledAt  = DateTime.UtcNow;
        TransitionTo(OrderStatus.CancelledByStaff, staffId, reason);
    }

    public void UpdateStaffNote(string? note)
    {
        StaffNote = note?.Trim();
        Touch();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public bool CanCustomerCancel() =>
        Status is OrderStatus.PendingPayment
               or OrderStatus.Paid
               or OrderStatus.AwaitingManualPlace;

    private void TransitionTo(OrderStatus newStatus, Guid? changedBy, string? note = null)
    {
        if (!IsValidTransition(Status, newStatus))
            throw new InvalidOrderTransitionException(Status.ToString(), newStatus.ToString());

        AppendHistory(Status, newStatus, changedBy, note);
        Status    = newStatus;
        UpdatedAt = DateTime.UtcNow;
    }

    private void AppendHistory(OrderStatus? from, OrderStatus to, Guid? changedBy, string? note) =>
        History.Add(OrderStatusHistory.Create(Id, from, to, changedBy, note));

    private static bool IsValidTransition(OrderStatus from, OrderStatus to) => (from, to) switch
    {
        (OrderStatus.PendingPayment,      OrderStatus.Paid)                  => true,
        (OrderStatus.PendingPayment,      OrderStatus.CancelledByTimeout)    => true,
        (OrderStatus.PendingPayment,      OrderStatus.CancelledByCustomer)   => true,
        (OrderStatus.Paid,                OrderStatus.AwaitingApiPlace)      => true,
        (OrderStatus.Paid,                OrderStatus.AwaitingManualPlace)   => true,
        (OrderStatus.Paid,                OrderStatus.CancelledByCustomer)   => true,
        (OrderStatus.AwaitingApiPlace,    OrderStatus.OrderedOnPlatform)     => true,
        (OrderStatus.AwaitingApiPlace,    OrderStatus.CancelledByStaff)      => true,
        (OrderStatus.AwaitingManualPlace, OrderStatus.OrderedOnPlatform)     => true,
        (OrderStatus.AwaitingManualPlace, OrderStatus.CancelledByStaff)      => true,
        (OrderStatus.AwaitingManualPlace, OrderStatus.CancelledByCustomer)   => true,
        (OrderStatus.OrderedOnPlatform,   OrderStatus.ShippedFromShop)       => true,
        (OrderStatus.ShippedFromShop,     OrderStatus.ArrivedChinaWh)        => true,
        (OrderStatus.ArrivedChinaWh,      OrderStatus.ShippingToVN)          => true,
        (OrderStatus.ShippingToVN,        OrderStatus.ArrivedVietnam)        => true,
        (OrderStatus.ArrivedVietnam,      OrderStatus.Delivering)            => true,
        (OrderStatus.Delivering,          OrderStatus.Completed)             => true,
        (OrderStatus.Delivering,          OrderStatus.Returned)              => true,
        _ => false,
    };

    private static string GenerateCode() =>
        $"MH-{DateTime.UtcNow:yyyyMM}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── OrderItem — SNAPSHOT, không reference live data ───────────────────────────
public class OrderItem
{
    public Guid     Id                   { get; private set; } = Guid.NewGuid();
    public Guid     OrderId              { get; private set; }
    public Guid     VariantId            { get; private set; }
    public string   ProductTitleSnapshot { get; private set; } = default!;
    public string?  VariantNameSnapshot  { get; private set; }
    /// Cache ảnh để hiển thị lịch sử đơn mà không cần JOIN product.
    public string?  ImageUrl             { get; private set; }
    public int      Quantity             { get; private set; }
    public decimal  UnitPriceCny         { get; private set; }
    /// = Quantity * UnitPriceCny
    public decimal  TotalCny             { get; private set; }
    public DateTime CreatedAt            { get; private set; } = DateTime.UtcNow;

    public CustomerOrder Order { get; private set; } = default!;

    private OrderItem() { }

    public static OrderItem Create(Guid orderId, Guid variantId,
                                    string productTitle, string? variantName, string? imageUrl,
                                    int quantity, decimal unitPriceCny)
    {
        if (quantity <= 0) throw new InvalidQuantityException(quantity);
        return new()
        {
            OrderId              = orderId,
            VariantId            = variantId,
            ProductTitleSnapshot = productTitle.Trim(),
            VariantNameSnapshot  = variantName?.Trim(),
            ImageUrl             = imageUrl?.Trim(),
            Quantity             = quantity,
            UnitPriceCny         = unitPriceCny,
            TotalCny             = Math.Round(unitPriceCny * quantity, 4),
        };
    }
}

// ── PlatformOrder — Bản ghi đặt hàng thật trên sàn ───────────────────────────
public class PlatformOrder
{
    public Guid    Id              { get; private set; } = Guid.NewGuid();
    public Guid    CustomerOrderId { get; private set; }

    /// Mã đơn trên sàn (NV tự điền hoặc system lấy từ API).
    public string? PlatformOrderId { get; private set; }
    /// Nhân viên tạo (null nếu là auto).
    public Guid?   CreatedByStaff  { get; private set; }

    // ── Tracking ──────────────────────────────────────────────────────────────
    public string? TrackingNumber  { get; private set; }
    public string? TrackingCarrier { get; private set; }
    public string? TrackingUrl     { get; private set; }

    // ── Issue ─────────────────────────────────────────────────────────────────
    public bool    HasIssue        { get; private set; }
    public string? IssueNote       { get; private set; }

    public string? Notes           { get; private set; }

    public DateTime  CreatedAt     { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt     { get; private set; }

    public CustomerOrder CustomerOrder { get; private set; } = default!;

    private PlatformOrder() { }

    /// Manual: NV tự điền mã đơn sàn.
    public static PlatformOrder CreateManual(Guid customerOrderId, Guid staffId,
                                              string platformOrderId, string? notes = null) =>
        new()
        {
            CustomerOrderId = customerOrderId,
            CreatedByStaff  = staffId,
            PlatformOrderId = platformOrderId.Trim(),
            Notes           = notes?.Trim(),
        };

    /// Auto: system lấy ID từ API sàn.
    public static PlatformOrder CreateAuto(Guid customerOrderId, string platformOrderId) =>
        new()
        {
            CustomerOrderId = customerOrderId,
            CreatedByStaff  = null,
            PlatformOrderId = platformOrderId.Trim(),
        };

    public void UpdateTracking(string trackingNumber, string carrier, string? url = null)
    {
        TrackingNumber  = trackingNumber.Trim();
        TrackingCarrier = carrier.Trim();
        TrackingUrl     = url?.Trim();
        UpdatedAt       = DateTime.UtcNow;
    }

    public void RecordIssue(string issueNote)
    {
        HasIssue  = true;
        IssueNote = issueNote.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}

// ── OrderStatusHistory — Audit trail ─────────────────────────────────────────
public class OrderStatusHistory
{
    public Guid         Id         { get; private set; } = Guid.NewGuid();
    public Guid         OrderId    { get; private set; }
    public OrderStatus? FromStatus { get; private set; }   // null khi tạo lần đầu
    public OrderStatus  ToStatus   { get; private set; }
    public Guid?        ChangedBy  { get; private set; }   // null = system action
    public string?      Note       { get; private set; }
    public DateTime     ChangedAt  { get; private set; } = DateTime.UtcNow;

    public CustomerOrder Order { get; private set; } = default!;

    private OrderStatusHistory() { }

    public static OrderStatusHistory Create(Guid orderId, OrderStatus? from, OrderStatus to,
                                             Guid? changedBy, string? note) =>
        new()
        {
            OrderId    = orderId,
            FromStatus = from,
            ToStatus   = to,
            ChangedBy  = changedBy,
            Note       = note?.Trim(),
        };
}

// ── StaffAssignment — Lịch sử phân công NV cho đơn hàng ──────────────────────
public class StaffAssignment
{
    public Guid      Id               { get; private set; } = Guid.NewGuid();
    public Guid      OrderId          { get; private set; }
    public Guid      StaffId          { get; private set; }
    public DateTime  AssignedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime  SlaDeadline      { get; private set; }
    public DateTime? CompletedAt      { get; private set; }
    public bool      IsOverdue        { get; private set; }
    /// null = auto-assign bởi job; có giá trị = admin tự chọn.
    public Guid?     AssignedByAdminId { get; private set; }
    public string?   Note             { get; private set; }

    // Navigation
    public CustomerOrder Order { get; private set; } = default!;

    private StaffAssignment() { }

    public static StaffAssignment Create(Guid orderId, Guid staffId, DateTime slaDeadline,
                                          Guid? assignedByAdminId = null, string? note = null) =>
        new()
        {
            OrderId           = orderId,
            StaffId           = staffId,
            SlaDeadline       = slaDeadline,
            AssignedByAdminId = assignedByAdminId,
            Note              = note?.Trim(),
        };

    /// Đánh dấu đơn đã xử lý xong (staff hoàn thành công việc của mình).
    public void MarkCompleted()
    {
        CompletedAt = DateTime.UtcNow;
    }

    /// Job SlaMonitor gọi khi phát hiện quá deadline.
    public void MarkOverdue()
    {
        IsOverdue = true;
    }
}

// ── OrderFeeDetail — Breakdown chi tiết phí ──────────────────────────────────
public class OrderFeeDetail
{
    public Guid     Id        { get; private set; } = Guid.NewGuid();
    public Guid     OrderId   { get; private set; }
    /// "service" | "shipping_cn_to_vn" | "ship_local" | "insurance"
    public string   FeeType   { get; private set; } = default!;
    public decimal  AmountVnd { get; private set; }
    public string?  Note      { get; private set; }

    public CustomerOrder Order { get; private set; } = default!;

    private OrderFeeDetail() { }

    public static OrderFeeDetail Create(Guid orderId, string feeType,
                                         decimal amountVnd, string? note = null) =>
        new()
        {
            OrderId   = orderId,
            FeeType   = feeType.Trim().ToLowerInvariant(),
            AmountVnd = amountVnd,
            Note      = note?.Trim(),
        };
}
