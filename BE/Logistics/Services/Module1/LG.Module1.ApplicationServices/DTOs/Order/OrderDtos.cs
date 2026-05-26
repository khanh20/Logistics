using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Order;

// ── Shared sub-records ────────────────────────────────────────────────────────

public record OrderItemResponse(
    Guid    Id,
    Guid    VariantId,
    string  ProductTitle,
    string? VariantName,
    string? ImageUrl,
    int     Quantity,
    decimal UnitPriceCny,
    decimal TotalCny
);

public record OrderStatusHistoryResponse(
    OrderStatus? FromStatus,
    OrderStatus  ToStatus,
    string?      Note,
    Guid?        ChangedBy,
    DateTime     ChangedAt
);

public record PlatformOrderResponse(
    Guid         Id,
    Guid         CustomerOrderId,
    string?      PlatformOrderId,
    string?      TrackingNumber,
    string?      TrackingCarrier,
    string?      IssueNote,
    bool         HasIssue,
    DateTime     CreatedAt,
    DateTime?    UpdatedAt
);

public record OrderFeeDetailResponse(
    string  FeeType,
    decimal AmountVnd,
    string? Note
);

// ── Customer-facing responses ─────────────────────────────────────────────────

public record OrderListItemResponse(
    Guid        Id,
    string      OrderCode,
    OrderStatus Status,
    string      StatusLabel,
    Guid        ShopId,
    string      ShopName,
    int         ItemCount,
    decimal     TotalCny,
    decimal     DepositVnd,
    decimal     RateVndPerCny,
    DateTime    CreatedAt,
    string?     ThumbnailUrl  // ảnh item đầu tiên
);

public record OrderDetailResponse(
    Guid                         Id,
    string                       OrderCode,
    OrderStatus                  Status,
    string                       StatusLabel,
    Guid                         CustomerId,
    Guid?                        AssignedStaffId,
    Guid                         ShopId,
    string                       ShopName,
    string                       PlacementMode,
    decimal                      TotalCny,
    decimal                      DepositPct,
    decimal                      DepositVnd,
    decimal                      FinalAmountVnd,
    decimal                      RateVndPerCny,
    bool                         IsDepositPaid,
    bool                         IsFinalPaid,
    string?                      DeliveryAddressNote,
    string?                      CustomerNote,
    string?                      StaffNote,
    DateTime                     CreatedAt,
    DateTime?                    PaidAt,
    DateTime?                    CompletedAt,
    DateTime?                    CancelledAt,
    string?                      CancelReason,
    List<OrderItemResponse>      Items,
    List<OrderStatusHistoryResponse> History,
    PlatformOrderResponse?       PlatformOrder,
    List<OrderFeeDetailResponse> Fees
);

// ── Staff / Admin list ────────────────────────────────────────────────────────

public record StaffOrderListItemResponse(
    Guid        Id,
    string      OrderCode,
    OrderStatus Status,
    string      StatusLabel,
    Guid        CustomerId,
    string?     CustomerEmail,
    Guid?       AssignedStaffId,
    Guid        ShopId,
    string      ShopName,
    string      PlacementMode,
    decimal     TotalCny,
    decimal     DepositVnd,
    DateTime    CreatedAt
);

// ── Requests ──────────────────────────────────────────────────────────────────

/// Staff: ghi nhận đã đặt hàng thủ công
public record ManualPlacementRequest(
    [Required] string PlatformOrderId,
    string? Note
);

/// Staff: cập nhật tracking
public record UpdateTrackingRequest(
    [Required] string TrackingNumber,
    [Required] string Carrier,
    string? Note
);

/// Staff: ghi nhận vấn đề
public record RecordIssueRequest(
    [Required] string IssueNote
);

/// Staff: chuyển trạng thái với note tuỳ chọn
public record OrderTransitionRequest(
    string? Note
);

/// Admin/Staff: hủy đơn
public record CancelOrderRequest(
    [Required] string Reason
);

// ── StaffAssignment DTOs ──────────────────────────────────────────────────────

public record StaffAssignmentDto(
    Guid      Id,
    Guid      OrderId,
    Guid      StaffId,
    DateTime  AssignedAt,
    DateTime  SlaDeadline,
    DateTime? CompletedAt,
    bool      IsOverdue,
    bool      IsAutoAssigned,
    string?   Note
);

public record OverdueAssignmentDto(
    Guid    AssignmentId,
    Guid    OrderId,
    string  OrderCode,
    Guid    StaffId,
    DateTime SlaDeadline,
    int     OverdueByMinutes,
    string  OrderStatus
);

public record ActiveAssignmentSummary(
    Guid     AssignmentId,
    Guid     OrderId,
    DateTime SlaDeadline,
    bool     IsOverdue
);

public record StaffWorkloadDto(
    Guid                          StaffId,
    int                           ActiveCount,
    int                           OverdueCount,
    List<StaffAssignmentDto>      Assignments
);

// ── Request: manual assign ────────────────────────────────────────────────────

public record ManualAssignRequest(
    [Required] Guid   StaffId,
    string?           Note = null
);

public record ReassignRequest(
    [Required] Guid   NewStaffId,
    string?           Note = null
);

/// Filter cho danh sách đơn (staff + admin)
public record OrderListFilter(
    Guid?       CustomerId    = null,
    Guid?       StaffId       = null,
    OrderStatus? Status       = null,
    DateTime?   FromDate      = null,
    DateTime?   ToDate        = null,
    int         Page          = 1,
    int         PageSize      = 20
);
