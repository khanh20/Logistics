using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
    [EnableRateLimiting("auth-sensitive")]
    public async Task<IActionResult> CancelOrder(Guid id, [FromBody] CancelOrderRequest req, CancellationToken ct)
    {
        var detail = await orderService.CancelOrderAsync(CurrentUserId, id, req, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đơn hàng đã được hủy."));
    }

    // POST /api/orders/{id}/pay-deposit 
    [HttpPost("{id:guid}/pay-deposit")]
    [Authorize(Policy = Permissions.OrderDeposit)]
    [EnableRateLimiting("auth-sensitive")]
    public async Task<IActionResult> PayDeposit(Guid id, CancellationToken ct)
    {
        var detail = await orderService.PayDepositAsync(CurrentUserId, id, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Đặt cọc thành công."));
    }

    // POST /api/orders/{id}/pay-final
    [HttpPost("{id:guid}/pay-final")]
    [Authorize(Policy = Permissions.OrderDeposit)]
    [EnableRateLimiting("auth-sensitive")]
    public async Task<IActionResult> PayFinal(Guid id, CancellationToken ct)
    {
        var detail = await orderService.PayFinalAsync(CurrentUserId, id, ct);
        return Ok(ApiResponse<OrderDetailResponse>.Ok(detail, "Thanh toán cuối kỳ thành công."));
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

    // GET /api/manage/orders/by-code/{orderCode}
    [HttpGet("by-code/{orderCode}")]
    [Authorize(Policy = Permissions.OrderManage)]
    public async Task<IActionResult> GetOrderDetailByCode(string orderCode, CancellationToken ct)
    {
        var detail = await mgmtService.GetOrderDetailByCodeAsync(orderCode, ct);
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
    public async Task<IActionResult> ArrivedVietnam(Guid id, [FromBody] ArrivedVietnamRequest req, CancellationToken ct)
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

    /// Internal API: Lấy tổng chi tiêu thực tế trên sàn của 1 tài khoản trong 1 ngày.
    [HttpGet("internal/platform-cost")]
    [AllowAnonymous] 
    [ProducesResponseType(typeof(ApiResponse<decimal>), 200)]
    public async Task<IActionResult> GetDailyPlatformCost(
        [FromQuery] Guid accountId,
        [FromQuery] string date,
        CancellationToken ct)
    {
        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(ApiResponse.Fail("Invalid date format. Expected yyyy-MM-dd."));

        var cost = await mgmtService.GetDailyPlatformCostAsync(accountId, parsedDate, ct);
        return Ok(ApiResponse<decimal>.Ok(cost));
    }

    /// Internal API: Lấy tổng doanh thu phí theo ngày thanh toán.
    [HttpGet("internal/daily-revenue-summary")]
    [AllowAnonymous] 
    [ProducesResponseType(typeof(ApiResponse<DailyRevenueSummaryDto>), 200)]
    public async Task<IActionResult> GetDailyRevenueSummary(
        [FromQuery] string date,
        CancellationToken ct)
    {
        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(ApiResponse.Fail("Invalid date format. Expected yyyy-MM-dd."));

        var summary = await mgmtService.GetDailyRevenueSummaryAsync(parsedDate, ct);
        return Ok(ApiResponse<DailyRevenueSummaryDto>.Ok(summary));
    }
}
