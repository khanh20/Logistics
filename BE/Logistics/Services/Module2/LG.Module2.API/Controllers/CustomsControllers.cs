using LG.Module2.ApplicationServices.DTOs.Customs;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Customs Clearance (UC-2.05) ───────────────────────────────────────────────
[Route("api/customs-clearances")]
public class CustomsClearancesController(ICustomsService customsService) : Module2BaseController
{
    // POST /api/customs-clearances
    [HttpPost]
    [Authorize(Policy = Permissions.ShipmentManage)]
    public async Task<IActionResult> Create([FromBody] CreateCustomsClearanceRequest req, CancellationToken ct)
    {
        var result = await customsService.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(result, "Tạo hồ sơ hải quan thành công."));
    }

    // GET /api/customs-clearances/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.ShipmentRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await customsService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // GET /api/customs-clearances/by-trip/{tripId}
    [HttpGet("by-trip/{tripId:guid}")]
    [Authorize(Policy = Permissions.ShipmentRead)]
    public async Task<IActionResult> GetByTrip(Guid tripId, CancellationToken ct)
    {
        var result = await customsService.GetByTripAsync(tripId, ct);
        return Ok(ApiResponse<object?>.Ok(result));
    }

    // GET /api/customs-clearances?status=Pending
    [HttpGet]
    [Authorize(Policy = Permissions.ShipmentRead)]
    public async Task<IActionResult> GetByStatus([FromQuery] CustomsClearanceStatus status = CustomsClearanceStatus.Pending, CancellationToken ct = default)
    {
        var list = await customsService.GetByStatusAsync(status, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // PUT /api/customs-clearances/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Permissions.ShipmentManage)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomsClearanceRequest req, CancellationToken ct)
    {
        var result = await customsService.UpdateStatusAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Cập nhật hồ sơ hải quan thành công."));
    }
}
