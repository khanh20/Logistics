using LG.Module2.ApplicationServices.DTOs.AI;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── AI Transit Forecast (Phase 8 — UC AItransit) ──────────────────────────────
[Route("api/ai/transit-forecasts")]
public class AITransitForecastsController(IAIForecastService aiService) : Module2BaseController
{
    // POST /api/ai/transit-forecasts — khách/nhân viên dự báo lead time TQ→VN
    [HttpPost]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> Forecast([FromBody] TransitForecastRequest req, CancellationToken ct)
    {
        var result = await aiService.ForecastTransitAsync(req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Dự báo thời gian vận chuyển thành công."));
    }

    // GET /api/ai/transit-forecasts/recent?limit=20 — staff xem lịch sử dự báo
    [HttpGet("recent")]
    [Authorize(Policy = Permissions.ShipmentRead)]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 20, CancellationToken ct = default)
    {
        var list = await aiService.GetRecentForecastsAsync(limit, ct);
        return Ok(ApiResponse<object>.Ok(list));
    }
}

// ── AI Border Alert (Phase 8 — UC AIborder) ───────────────────────────────────
[Route("api/ai/border-alerts")]
public class AIBorderAlertsController(IAIForecastService aiService) : Module2BaseController
{
    // GET /api/ai/border-alerts — cảnh báo đang active (khách xem được)
    [HttpGet]
    [Authorize(Policy = Permissions.OrderRead)]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var list = await aiService.GetActiveBorderAlertsAsync(ct);
        return Ok(ApiResponse<object>.Ok(list));
    }

    // GET /api/ai/border-alerts/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = Permissions.ShipmentRead)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await aiService.GetBorderAlertAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result));
    }

    // POST /api/ai/border-alerts — staff tạo cảnh báo thủ công
    [HttpPost]
    [Authorize(Policy = Permissions.ShipmentManage)]
    public async Task<IActionResult> Create([FromBody] CreateBorderAlertRequest req, CancellationToken ct)
    {
        var result = await aiService.CreateBorderAlertAsync(req, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<object>.Ok(result, "Tạo cảnh báo tắc biên thành công."));
    }

    // POST /api/ai/border-alerts/{id}/resolve — gỡ cảnh báo
    [HttpPost("{id:guid}/resolve")]
    [Authorize(Policy = Permissions.ShipmentManage)]
    public async Task<IActionResult> Resolve(Guid id, CancellationToken ct)
    {
        var result = await aiService.ResolveBorderAlertAsync(id, ct);
        return Ok(ApiResponse<object>.Ok(result, "Đã gỡ cảnh báo tắc biên."));
    }

    // POST /api/ai/border-alerts/scan — quét dữ liệu nội bộ tìm dấu hiệu tắc biên
    // (Phase 8 stub: trigger thủ công; sau này chuyển thành BackgroundService chạy định kỳ)
    [HttpPost("scan")]
    [Authorize(Policy = Permissions.ShipmentManage)]
    public async Task<IActionResult> Scan(CancellationToken ct)
    {
        var result = await aiService.ScanBorderCongestionAsync(ct);
        return Ok(ApiResponse<object>.Ok(result,
            result.AlertsCreated > 0
                ? $"Phát hiện tắc biên: đã tạo {result.AlertsCreated} cảnh báo."
                : "Không phát hiện dấu hiệu tắc biên."));
    }
}
