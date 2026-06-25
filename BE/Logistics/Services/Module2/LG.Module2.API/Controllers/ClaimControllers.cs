using LG.Module2.ApplicationServices.DTOs.Claim;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Missing Claims (UC-2.10) ──────────────────────────────────────────────────
[Route("api/missing-claims")]
public class MissingClaimsController(IClaimService claimService) : Module2BaseController
{
    // POST /api/missing-claims  (khách tạo khiếu nại thất lạc)
    [HttpPost]
    [Authorize(Policy = Permissions.OrderCreate)]
    public async Task<IActionResult> Create([FromBody] CreateMissingClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.CreateMissingClaimAsync(CurrentUserId, req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(result, "Đã gửi khiếu nại thất lạc."));
    }

    // GET /api/missing-claims/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.ComplaintRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await claimService.GetMissingClaimAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // GET /api/missing-claims?status=Submitted  (staff CSKH)
    [HttpGet]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> GetByStatus([FromQuery] MissingClaimStatus status = MissingClaimStatus.Submitted, CancellationToken ct = default)
    {
        var list = await claimService.GetMissingClaimsByStatusAsync(status, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // POST /api/missing-claims/{id}/investigate  (staff)
    [HttpPost("{id:guid}/investigate")]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> Investigate(Guid id, [FromBody] InvestigateClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.InvestigateMissingClaimAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã chuyển sang điều tra."));
    }

    // POST /api/missing-claims/{id}/resolve  (staff — xác nhận thất lạc & bồi thường)
    [HttpPost("{id:guid}/resolve")]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> Resolve(Guid id, [FromBody] ResolveMissingClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.ResolveMissingClaimAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã xử lý khiếu nại."));
    }

    // POST /api/missing-claims/{id}/reject  (staff)
    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.RejectMissingClaimAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã từ chối khiếu nại."));
    }
}

// ── Missing Claims (Customer view) ────────────────────────────────────────────
[Route("api/my/missing-claims")]
public class MyMissingClaimsController(IClaimService claimService) : Module2BaseController
{
    // GET /api/my/missing-claims
    [HttpGet]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var list = await claimService.GetMyMissingClaimsAsync(CurrentUserId, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }
}

// ── Insurance Claims (UC-2.10) ────────────────────────────────────────────────
[Route("api/insurance-claims")]
public class InsuranceClaimsController(IClaimService claimService) : Module2BaseController
{
    // POST /api/insurance-claims  (khách tạo yêu cầu bồi thường)
    [HttpPost]
    [Authorize(Policy = Permissions.OrderCreate)]
    public async Task<IActionResult> Create([FromBody] CreateInsuranceClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.CreateInsuranceClaimAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(result, "Đã gửi yêu cầu bồi thường bảo hiểm."));
    }

    // GET /api/insurance-claims/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.ComplaintRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await claimService.GetInsuranceClaimAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // PUT /api/insurance-claims/{id}  (staff duyệt/từ chối)
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateInsuranceClaimRequest req, CancellationToken ct)
    {
        var result = await claimService.UpdateInsuranceClaimAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã cập nhật yêu cầu bồi thường."));
    }

    // POST /api/insurance-claims/{id}/pay  (staff chi trả → hoàn ví)
    [HttpPost("{id:guid}/pay")]
    [Authorize(Policy = Permissions.ComplaintManage)]
    public async Task<IActionResult> Pay(Guid id, CancellationToken ct)
    {
        var result = await claimService.PayInsuranceClaimAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã chi trả bồi thường."));
    }
}
