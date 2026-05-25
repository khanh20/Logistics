using LG.Module2.ApplicationServices.DTOs.Sack;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

[Route("api/sacks")]
public class SacksController(ISackService sackService) : Module2BaseController
{
    // POST /api/sacks
    [HttpPost]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> Create([FromBody] CreateSackRequest req, CancellationToken ct)
    {
        var result = await sackService.CreateAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<object>.Ok(result, "Tạo bao thành công."));
    }

    // GET /api/sacks/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var sack = await sackService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(sack));
    }

    // GET /api/sacks/code/{sackCode}
    [HttpGet("code/{sackCode}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetByCode(string sackCode, CancellationToken ct)
    {
        var sack = await sackService.GetBySackCodeAsync(sackCode, ct);
        return Ok(ApiResponse<object>.Ok(sack));
    }

    // GET /api/sacks?status=Packing
    [HttpGet]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetByStatus([FromQuery] SackStatus status = SackStatus.Packing, CancellationToken ct = default)
    {
        var list = await sackService.GetByStatusAsync(status, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // POST /api/sacks/{id}/packages     — thêm kiện vào bao
    [HttpPost("{id:guid}/packages")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> AddPackage(Guid id, [FromBody] AddPackageToSackRequest req, CancellationToken ct)
    {
        var result = await sackService.AddPackageAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<object>.Ok(result, $"Đã thêm kiện '{req.Barcode}' vào bao."));
    }

    // DELETE /api/sacks/{id}/packages/{barcode}   — rã kiện khỏi bao
    [HttpDelete("{id:guid}/packages/{barcode}")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> RemovePackage(Guid id, string barcode, CancellationToken ct)
    {
        var result = await sackService.RemovePackageAsync(id, barcode, ct);
        return Ok(ApiResponse<object>.Ok(result, $"Đã rã kiện '{barcode}' khỏi bao."));
    }

    // POST /api/sacks/{id}/seal   UC-2.03
    [HttpPost("{id:guid}/seal")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> Seal(Guid id, [FromBody] SealSackRequest req, CancellationToken ct)
    {
        var result = await sackService.SealAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<object>.Ok(result, $"Bao đã được kẹp chì: {req.SealCode}."));
    }
}
