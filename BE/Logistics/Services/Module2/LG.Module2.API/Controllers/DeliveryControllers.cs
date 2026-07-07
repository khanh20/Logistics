using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Delivery Requests (Customer) — UC-2.08 ────────────────────────────────────
[Route("api/delivery-requests")]
public class DeliveryRequestsController(IDeliveryService deliveryService) : Module2BaseController
{
    // POST /api/delivery-requests
    [HttpPost]
    [Authorize(Policy = Permissions.OrderCreate)]
    public async Task<IActionResult> Create([FromBody] CreateDeliveryRequest req, CancellationToken ct)
    {
        var result = await deliveryService.CreateAsync(CurrentUserId, req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(result, "Tạo yêu cầu giao hàng thành công."));
    }

    // GET /api/delivery-requests/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await deliveryService.GetByIdAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // GET /api/delivery-requests  (của khách hiện tại)
    [HttpGet]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var list = await deliveryService.GetByCustomerAsync(CurrentUserId, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // DELETE /api/delivery-requests/{id}  (huỷ khi chưa giao carrier)
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.OrderCreate)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await deliveryService.CancelAsync(id, CurrentUserId, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã huỷ yêu cầu giao hàng."));
    }
}
