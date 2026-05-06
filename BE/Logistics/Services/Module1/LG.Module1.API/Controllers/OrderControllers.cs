using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

// ── Customer Order Controller ─────────────────────────────────────────────────
/// Customer order endpoints.
/// Customers chỉ xem/hủy đơn của chính mình.
[Route("api/orders")]
public class CustomerOrderController(ICustomerOrderService orderService) : Module1BaseController
{
    // GET /api/orders?status=&page=&pageSize=
    [HttpGet]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetMyOrders(
        [FromQuery] OrderStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var (items, total) = await orderService.GetMyOrdersAsync(CurrentUserId, status, page, pageSize, ct);
        return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
    }

    // GET /api/orders/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetMyOrderDetail(Guid id, CancellationToken ct)
    {
        var detail = await orderService.GetMyOrderDetailAsync(CurrentUserId, id, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail));
    }

    // POST /api/orders/{id}/cancel
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = Permissions.OrderCreate)]
    public async Task<IActionResult> CancelOrder(Guid id, [FromBody] CancelOrderRequest req, CancellationToken ct)
    {
        var detail = await orderService.CancelOrderAsync(CurrentUserId, id, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đơn hàng đã được hủy."));
    }

    // POST /api/orders/{id}/pay-deposit  (Phase 8 — wallet stub)
    [HttpPost("{id:guid}/pay-deposit")]
    [Authorize(Policy = Permissions.OrderDeposit)]
    public async Task<IActionResult> PayDeposit(Guid id, CancellationToken ct)
    {
        var detail = await orderService.PayDepositAsync(CurrentUserId, id, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đặt cọc thành công."));
    }
}

// ── Staff / Admin Order Controller ────────────────────────────────────────────
/// Staff and Admin order management endpoints.
[Route("api/manage/orders")]
public class OrderManagementController(IOrderManagementService mgmtService) : Module1BaseController
{
    // GET /api/manage/orders
    [HttpGet]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderListFilter filter, CancellationToken ct)
    {
        var (items, total) = await mgmtService.GetOrdersAsync(filter, ct);
        return Ok(ApiResponse<object>.Ok(new { items, total, filter.Page, filter.PageSize }));
    }

    // GET /api/manage/orders/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> GetOrderDetail(Guid id, CancellationToken ct)
    {
        var detail = await mgmtService.GetOrderDetailAsync(id, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail));
    }

    // POST /api/manage/orders/{id}/assign
    [HttpPost("{id:guid}/assign")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> Assign(Guid id, CancellationToken ct)
    {
        var detail = await mgmtService.AssignOrderAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã nhận đơn."));
    }

    // POST /api/manage/orders/{id}/place-manual
    [HttpPost("{id:guid}/place-manual")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> PlaceManual(Guid id, [FromBody] ManualPlacementRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.RecordManualPlacementAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã ghi nhận đặt hàng trên sàn."));
    }

    // PATCH /api/manage/orders/{id}/tracking
    [HttpPatch("{id:guid}/tracking")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> UpdateTracking(Guid id, [FromBody] UpdateTrackingRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.UpdateTrackingAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã cập nhật tracking."));
    }

    // POST /api/manage/orders/{id}/arrived-china
    [HttpPost("{id:guid}/arrived-china")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> ArrivedChina(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkArrivedChinaAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã ghi nhận hàng về kho TQ."));
    }

    // POST /api/manage/orders/{id}/shipping-to-vn
    [HttpPost("{id:guid}/shipping-to-vn")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> ShippingToVN(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkShippingToVNAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đang vận chuyển về VN."));
    }

    // POST /api/manage/orders/{id}/arrived-vietnam
    [HttpPost("{id:guid}/arrived-vietnam")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> ArrivedVietnam(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkArrivedVietnamAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Hàng đã về kho VN."));
    }

    // POST /api/manage/orders/{id}/delivering
    [HttpPost("{id:guid}/delivering")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> Delivering(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkDeliveringAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đang giao hàng cho khách."));
    }

    // POST /api/manage/orders/{id}/complete
    [HttpPost("{id:guid}/complete")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> Complete(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkCompletedAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đơn hàng hoàn thành."));
    }

    // POST /api/manage/orders/{id}/record-issue
    [HttpPost("{id:guid}/record-issue")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> RecordIssue(Guid id, [FromBody] RecordIssueRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.RecordIssueAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã ghi nhận vấn đề phát sinh."));
    }

    // POST /api/manage/orders/{id}/cancel
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> CancelByStaff(Guid id, [FromBody] CancelOrderRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.CancelByStaffAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đơn đã được hủy bởi NV."));
    }

    // POST /api/manage/orders/{id}/return
    [HttpPost("{id:guid}/return")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> Return(Guid id, [FromBody] OrderTransitionRequest req, CancellationToken ct)
    {
        var detail = await mgmtService.MarkReturnedAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đã ghi nhận hoàn hàng."));
    }
}
