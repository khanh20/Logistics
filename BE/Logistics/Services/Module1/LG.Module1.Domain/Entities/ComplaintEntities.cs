using LG.Module1.Domain.Exceptions;

namespace LG.Module1.Domain.Entities;

// ── ComplaintType / Status ────────────────────────────────────────────────────
public enum ComplaintType
{
    WrongItem      = 1,   // Giao sai sản phẩm
    Damaged        = 2,   // Hàng hư hỏng
    Missing        = 3,   // Thiếu hàng
    NotAsDescribed = 4,   // Không đúng mô tả
    Late           = 5,   // Giao trễ
    Other          = 6,
}

public enum ComplaintStatus
{
    New              = 1,   // Khách vừa gửi
    InReview         = 2,   // NV CSKH đang xử lý
    AwaitingCustomer = 3,   // Chờ khách bổ sung thông tin
    Resolved         = 4,   // Đã giải quyết
    Rejected         = 5,   // Từ chối (không hợp lệ)
}

// ── OrderComplaint — khiếu nại của khách về 1 đơn ────────────────────────────
public class OrderComplaint
{
    public Guid            Id              { get; private set; } = Guid.NewGuid();
    public Guid            OrderId         { get; private set; }
    public Guid?           OrderItemId     { get; private set; }
    public Guid            CustomerId      { get; private set; }
    public ComplaintType   Type            { get; private set; }
    public string          Description     { get; private set; } = default!;
    /// JSON array các URL ảnh/chứng cứ.
    public string?         EvidenceUrls    { get; private set; }
    public ComplaintStatus Status          { get; private set; } = ComplaintStatus.New;
    /// NV CSKH đang phụ trách (null = chưa ai nhận).
    public Guid?           AssignedToStaffId { get; private set; }
    public string?         Resolution      { get; private set; }
    public decimal?        ResolvedAmountVnd { get; private set; }
    public Guid?           HandledByStaffId { get; private set; }
    public DateTime        CreatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime        UpdatedAt       { get; private set; } = DateTime.UtcNow;
    public DateTime?       ResolvedAt      { get; private set; }

    // Navigation
    public CustomerOrder Order { get; private set; } = default!;

    private OrderComplaint() { }

    public static OrderComplaint Create(Guid orderId, Guid customerId, ComplaintType type,
                                        string description, Guid? orderItemId = null,
                                        string? evidenceUrls = null) =>
        new()
        {
            OrderId      = orderId,
            CustomerId   = customerId,
            Type         = type,
            Description  = description.Trim(),
            OrderItemId  = orderItemId,
            EvidenceUrls = evidenceUrls,
        };

    /// NV CSKH nhận xử lý.
    public void AssignTo(Guid staffId)
    {
        AssignedToStaffId = staffId;
        if (Status == ComplaintStatus.New) Status = ComplaintStatus.InReview;
        Touch();
    }

    public void RequestMoreInfo(string note)
    {
        Status     = ComplaintStatus.AwaitingCustomer;
        Resolution = note.Trim();
        Touch();
    }

    public void Resolve(Guid staffId, string resolution, decimal? resolvedAmountVnd)
    {
        if (Status is ComplaintStatus.Resolved or ComplaintStatus.Rejected)
            throw new InvalidOrderTransitionException(Status.ToString(), ComplaintStatus.Resolved.ToString());
        Status            = ComplaintStatus.Resolved;
        Resolution        = resolution.Trim();
        ResolvedAmountVnd = resolvedAmountVnd;
        HandledByStaffId  = staffId;
        ResolvedAt        = DateTime.UtcNow;
        Touch();
    }

    public void Reject(Guid staffId, string reason)
    {
        if (Status is ComplaintStatus.Resolved or ComplaintStatus.Rejected)
            throw new InvalidOrderTransitionException(Status.ToString(), ComplaintStatus.Rejected.ToString());
        Status           = ComplaintStatus.Rejected;
        Resolution       = reason.Trim();
        HandledByStaffId = staffId;
        ResolvedAt       = DateTime.UtcNow;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}

// ── SupplierChatLog — nhật ký trao đổi giữa NV và shop TQ ────────────────────
public enum ChatDirection { Sent = 1, Received = 2 }

public class SupplierChatLog
{
    public Guid          Id              { get; private set; } = Guid.NewGuid();
    public Guid          OrderId         { get; private set; }
    public Guid          StaffId         { get; private set; }
    public ChatDirection Direction       { get; private set; }
    public string        Message         { get; private set; } = default!;
    public string?       ScreenshotUrl   { get; private set; }
    /// Công cụ chat (Wangwang, AliChat...).
    public string?       PlatformChatTool { get; private set; }
    public DateTime      SentAt          { get; private set; } = DateTime.UtcNow;

    private SupplierChatLog() { }

    public static SupplierChatLog Create(Guid orderId, Guid staffId, ChatDirection direction,
                                         string message, string? screenshotUrl = null,
                                         string? platformChatTool = null) =>
        new()
        {
            OrderId          = orderId,
            StaffId          = staffId,
            Direction        = direction,
            Message          = message.Trim(),
            ScreenshotUrl    = screenshotUrl?.Trim(),
            PlatformChatTool = platformChatTool?.Trim(),
        };
}
