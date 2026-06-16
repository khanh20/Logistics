using LG.Module2.ApplicationServices.DTOs.Warehouse;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Warehouse (Staff/Admin) ───────────────────────────────────────────────────
[Route("api/warehouses")]
public class WarehousesController(IWarehouseService warehouseService) : Module2BaseController
{
    // GET /api/warehouses
    [HttpGet]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await warehouseService.GetAllAsync(ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // GET /api/warehouses/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.WarehouseRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var wh = await warehouseService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(wh));
    }

    // POST /api/warehouses/{id}/receive-cn   UC-2.01
    [HttpPost("{id:guid}/receive-cn")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> ReceiveCn(Guid id, [FromBody] CnWarehouseReceiveRequest req, CancellationToken ct)
    {
        var result = await warehouseService.ReceiveAtChinaWarehouseAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Nhập kho TQ thành công."));
    }

    // POST /api/warehouses/{id}/receive-vn   UC-2.06
    [HttpPost("{id:guid}/receive-vn")]
    [Authorize(Policy = Permissions.WarehouseManage)]
    public async Task<IActionResult> ReceiveVn(Guid id, [FromBody] VnWarehouseReceiveRequest req, CancellationToken ct)
    {
        var result = await warehouseService.ReceiveAtVnWarehouseAsync(id, CurrentUserId, req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Nhập kho VN thành công."));
    }
}
