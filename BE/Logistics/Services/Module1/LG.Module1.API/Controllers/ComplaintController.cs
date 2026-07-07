using LG.Module1.ApplicationServices.DTOs.Staff;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

// ── Khiếu nại của khách (customer-facing) ────────────────────────────────────
[Route("api/orders/{orderId:guid}/complaints")]
[Authorize(Policy = Permissions.OrderRead)]
public class CustomerComplaintController(IComplaintService complaintService) : Module1BaseController
{
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ComplaintResponse>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Submit(Guid orderId, [FromBody] SubmitComplaintRequest req, CancellationToken ct)
    {
        var result = await complaintService.SubmitAsync(CurrentUserId, orderId, req, ct);
        return StatusCode(201, ApiResponse<ComplaintResponse>.Ok(result, "Đã gửi khiếu nại."));
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ComplaintResponse>>), 200)]
    public async Task<IActionResult> GetMine(Guid orderId, CancellationToken ct)
    {
        var result = await complaintService.GetByOrderForCustomerAsync(CurrentUserId, orderId, ct);
        return Ok(ApiResponse<List<ComplaintResponse>>.Ok(result));
    }
}

// ── Hàng đợi khiếu nại cho NV CSKH ───────────────────────────────────────────
[Route("api/staff/complaints")]
[Authorize(Policy = Permissions.ComplaintManage)]
public class StaffComplaintController(IComplaintService complaintService) : Module1BaseController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<object>), 200)]
    public async Task<IActionResult> GetQueue(
        [FromQuery] string? status,
        [FromQuery] bool mine = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        ComplaintStatus? statusFilter = Enum.TryParse<ComplaintStatus>(status, ignoreCase: true, out var s) ? s : null;
        Guid? assignedTo = mine ? CurrentUserId : null;

        var (items, total) = await complaintService.GetQueueAsync(statusFilter, assignedTo, page, pageSize, ct);
        return Ok(ApiResponse<object>.Ok(new { items, total, page, pageSize }));
    }

    [HttpPost("{id:guid}/assign")]
    [ProducesResponseType(typeof(ApiResponse<ComplaintResponse>), 200)]
    public async Task<IActionResult> AssignToMe(Guid id, CancellationToken ct)
    {
        var result = await complaintService.AssignAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<ComplaintResponse>.Ok(result, "Đã nhận xử lý."));
    }

    [HttpPost("{id:guid}/resolve")]
    [ProducesResponseType(typeof(ApiResponse<ComplaintResponse>), 200)]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveComplaintRequest req, CancellationToken ct)
    {
        var result = await complaintService.ResolveAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<ComplaintResponse>.Ok(result, "Đã giải quyết."));
    }

    [HttpPost("{id:guid}/reject")]
    [ProducesResponseType(typeof(ApiResponse<ComplaintResponse>), 200)]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectComplaintRequest req, CancellationToken ct)
    {
        var result = await complaintService.RejectAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<ComplaintResponse>.Ok(result, "Đã từ chối."));
    }
}
