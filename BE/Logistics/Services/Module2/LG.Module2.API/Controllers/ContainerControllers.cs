using LG.Module2.ApplicationServices.DTOs.Container;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

[Route("api/container-trips")]
public class ContainerTripsController(IContainerService containerService) : Module2BaseController
{
    // POST /api/container-trips   UC-2.04
    [HttpPost]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> Create([FromBody] CreateTripRequest req, CancellationToken ct)
    {
        var result = await containerService.CreateTripAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result, "Tạo chuyến container thành công."));
    }

    // GET /api/container-trips/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var trip = await containerService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(trip));
    }

    // GET /api/container-trips?status=Loading
    [HttpGet]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetByStatus([FromQuery] ContainerTripStatus status = ContainerTripStatus.Loading, CancellationToken ct = default)
    {
        var list = await containerService.GetByStatusAsync(status, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // POST /api/container-trips/{id}/assign-sacks
    [HttpPost("{id:guid}/assign-sacks")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> AssignSacks(Guid id, [FromBody] AssignSacksRequest req, CancellationToken ct)
    {
        var result = await containerService.AssignSacksAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, $"Đã gán {req.SackCodes.Count} bao vào chuyến."));
    }

    // POST /api/container-trips/{id}/depart
    [HttpPost("{id:guid}/depart")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> Depart(Guid id, [FromBody] DepartTripRequest req, CancellationToken ct)
    {
        var result = await containerService.DepartAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Chuyến đã xuất phát."));
    }

    // POST /api/container-trips/{id}/reach-border
    [HttpPost("{id:guid}/reach-border")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> ReachBorder(Guid id, CancellationToken ct)
    {
        var result = await containerService.ReachBorderAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result, "Cập nhật qua cửa khẩu thành công."));
    }

    // POST /api/container-trips/{id}/arrive-vn
    [HttpPost("{id:guid}/arrive-vn")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> ArriveVietnam(Guid id, [FromBody] ArriveVietnamRequest req, CancellationToken ct)
    {
        var result = await containerService.ArriveVietnamAsync(id, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Chuyến đã về đến kho VN."));
    }
}
