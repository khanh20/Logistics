using System.ComponentModel.DataAnnotations;

namespace LG.Module1.ApplicationServices.DTOs.Staff;

// ── Assignment queue (portal NV) ──────────────────────────────────────────────
public record StaffQueueItemDto(
    Guid      AssignmentId,
    Guid      OrderId,
    string    OrderCode,
    string    OrderStatus,
    string    OrderStatusLabel,
    string    AssignmentStatus,
    decimal   FinalAmountVnd,
    int       ItemCount,
    DateTime  AssignedAt,
    DateTime  SlaDeadline,
    DateTime? AcceptedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    bool      IsOverdue,
    int?      HandlingMinutes
);

// ── Work setting (ca làm + năng lực) ──────────────────────────────────────────
public record StaffWorkSettingDto(
    Guid      StaffId,
    string?   StaffName,
    string?   StaffEmail,
    bool      IsAvailable,
    bool      AutoAssignEnabled,
    int       MaxConcurrentOrders,
    string?   ShiftStartLocal,   // "HH:mm" hoặc null
    string?   ShiftEndLocal,
    DateTime? LastActiveAt,
    int       ActiveLoad
);

public record UpdateWorkSettingRequest(
    bool    IsAvailable,
    bool    AutoAssignEnabled,
    [Range(1, 100)] int MaxConcurrentOrders,
    string? ShiftStartLocal,   // "HH:mm"
    string? ShiftEndLocal
);

// ── KPI ───────────────────────────────────────────────────────────────────────
public record StaffKpiPointDto(
    DateOnly Date,
    int      OrdersAssigned,
    int      OrdersCompleted,
    int      OnTimeCount,
    int      OverdueCount,
    int      CancelledCount,
    int      AvgHandlingMinutes
);

public record StaffKpiDto(
    Guid     StaffId,
    string?  StaffName,
    DateOnly From,
    DateOnly To,
    int      OrdersAssigned,
    int      OrdersCompleted,
    int      OnTimeCount,
    int      OverdueCount,
    int      CancelledCount,
    int      AvgHandlingMinutes,
    decimal  OnTimeRate,
    List<StaffKpiPointDto> Series
);

// ── Notification ──────────────────────────────────────────────────────────────
public record StaffNotificationDto(
    Guid     Id,
    string   Type,
    string   Title,
    string   Body,
    Guid?    RefOrderId,
    bool     IsRead,
    DateTime CreatedAt
);

// ── Complaint ─────────────────────────────────────────────────────────────────
public record ComplaintResponse(
    Guid      Id,
    Guid      OrderId,
    string    OrderCode,
    Guid?     OrderItemId,
    Guid      CustomerId,
    string    Type,
    string    Description,
    List<string> EvidenceUrls,
    string    Status,
    Guid?     AssignedToStaffId,
    string?   AssignedToStaffName,
    string?   Resolution,
    decimal?  ResolvedAmountVnd,
    DateTime  CreatedAt,
    DateTime? ResolvedAt
);

public record SubmitComplaintRequest(
    [Required] string Type,           // ComplaintType name
    [Required] string Description,
    Guid?      OrderItemId = null,
    List<string>? EvidenceUrls = null
);

public record ResolveComplaintRequest(
    [Required] string Resolution,
    decimal?   ResolvedAmountVnd = null
);

public record RejectComplaintRequest(
    [Required] string Reason
);

// ── Supplier chat log ─────────────────────────────────────────────────────────
public record SupplierChatLogDto(
    Guid     Id,
    Guid     OrderId,
    Guid     StaffId,
    string   Direction,
    string   Message,
    string?  ScreenshotUrl,
    string?  PlatformChatTool,
    DateTime SentAt
);

public record AddSupplierChatRequest(
    [Required] string Direction,      // "Sent" | "Received"
    [Required] string Message,
    string?    ScreenshotUrl = null,
    string?    PlatformChatTool = null
);
