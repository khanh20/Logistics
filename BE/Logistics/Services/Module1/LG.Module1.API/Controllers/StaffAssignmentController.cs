using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module1.API.Controllers;

/// Quản lý phân công nhân viên và SLA cho đơn hàng.
/// Tất cả endpoints đều yêu cầu quyền order.manage.
[Route("api/manage/assignments")]
public class StaffAssignmentController(IStaffAssignmentService assignmentService)
    : Module1BaseController
{
    // POST /api/manage/assignments/auto/{orderId}
    /// Auto-assign một đơn cụ thể (admin muốn trigger thủ công).
    [HttpPost("auto/{orderId:guid}")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> AutoAssign(
        Guid orderId,
        [FromBody] AutoAssignRequest req,
        CancellationToken ct)
    {
        var result = await assignmentService.AutoAssignAsync(orderId, req.StaffIds, ct);
        if (result is null)
            return BadRequest(ApiResponse<object>.Fail("Không có nhân viên available để phân công."));
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result, "Đã phân công tự động."));
    }

    // POST /api/manage/assignments/manual
    /// Admin tự chọn staff cho một đơn.
    [HttpPost("manual")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ManualAssign(
        [FromBody] ManualAssignOrderRequest req,
        CancellationToken ct)
    {
        var result = await assignmentService.ManualAssignAsync(
            req.OrderId, req.StaffId, CurrentUserId, req.Note, ct);
        return StatusCode(201, ApiResponse<StaffAssignmentDto>.Ok(result, "Đã phân công."));
    }

    // PUT /api/manage/assignments/{orderId}/reassign
    /// Chuyển đơn sang nhân viên khác.
    [HttpPut("{orderId:guid}/reassign")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Reassign(
        Guid orderId,
        [FromBody] ReassignRequest req,
        CancellationToken ct)
    {
        var result = await assignmentService.ReassignAsync(
            orderId, req.NewStaffId, CurrentUserId, req.Note, ct);
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result, "Đã chuyển nhân viên."));
    }

    // GET /api/manage/assignments/overdue
    /// Danh sách đơn đang quá SLA.
    [HttpGet("overdue")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<List<OverdueAssignmentDto>>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<IActionResult> GetOverdue(CancellationToken ct)
    {
        var result = await assignmentService.GetOverdueAsync(ct);
        return Ok(ApiResponse<List<OverdueAssignmentDto>>.Ok(result));
    }

    // GET /api/manage/assignments/workload/{staffId}
    /// Workload hiện tại của một nhân viên.
    [HttpGet("workload/{staffId:guid}")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<StaffWorkloadDto>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetWorkload(Guid staffId, CancellationToken ct)
    {
        var result = await assignmentService.GetWorkloadAsync(staffId, ct);
        return Ok(ApiResponse<StaffWorkloadDto>.Ok(result));
    }

    // GET /api/manage/assignments/order/{orderId}
    /// Assignment đang active của một đơn (dùng trên FE admin order detail).
    [HttpGet("order/{orderId:guid}")]
    [Authorize(Policy = Permissions.OrderManage)]
    [ProducesResponseType(typeof(ApiResponse<StaffAssignmentDto>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetActiveByOrder(Guid orderId, CancellationToken ct)
    {
        var result = await assignmentService.GetActiveByOrderAsync(orderId, ct);
        if (result is null) return NotFound(ApiResponse<object>.Fail("Đơn chưa được phân công."));
        return Ok(ApiResponse<StaffAssignmentDto>.Ok(result));
    }
}

// ── Request records ───────────────────────────────────────────────────────────

public record AutoAssignRequest(
    IReadOnlyList<Guid> StaffIds
);

public record ManualAssignOrderRequest(
    Guid    OrderId,
    Guid    StaffId,
    string? Note = null
);
