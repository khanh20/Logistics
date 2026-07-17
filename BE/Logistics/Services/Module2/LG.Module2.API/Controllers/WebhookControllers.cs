using LG.Module2.ApplicationServices.DTOs.Delivery;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Module2.API.Controllers;

// ── Carrier Webhooks (GHTK/GHN) — UC-2.09 ─────────────────────────────────────
// Không yêu cầu JWT — xác thực qua token/HMAC trong payload (carrier WebhookSecret / GHTK token).
[ApiController]
[AllowAnonymous]
[Route("api/webhooks")]
public class WebhookController(ITrackingService trackingService) : ControllerBase
{
    // POST /api/webhooks/ghtk
    // GHTK gửi form-urlencoded: partner_id, label_id, status_id, action_time, fee, pick_money, reason, weight.
    // Xác thực bằng token GHTK gửi kèm (header X-Apitoken hoặc query ?token=).
    [HttpPost("ghtk")]
    [Consumes("application/x-www-form-urlencoded", "application/json")]
    public async Task<IActionResult> Ghtk([FromForm] GhtkWebhookForm form, [FromQuery] string? token, CancellationToken ct)
    {
        var signature = Request.Headers["X-Apitoken"].FirstOrDefault() ?? token;
        var req = new CarrierWebhookRequest(
            TrackingNo: form.LabelId ?? "",
            Status:     form.StatusId?.ToString() ?? "",
            FeeVnd:     form.Fee,
            Reason:     form.Reason,
            Signature:  signature);

        var result = await trackingService.ProcessWebhookAsync("GHTK", req, ct);
        // GHTK chỉ cần HTTP 200 để coi là đã nhận.
        return Ok(ApiResponse<object>.Ok(result, "Webhook GHTK đã xử lý."));
    }

    // POST /api/webhooks/ghn   (JSON chuẩn hoá — carrier chưa tích hợp API thật)
    [HttpPost("ghn")]
    public async Task<IActionResult> Ghn([FromBody] CarrierWebhookRequest req, CancellationToken ct)
    {
        var result = await trackingService.ProcessWebhookAsync("GHN", req, ct);
        return Ok(ApiResponse<object>.Ok(result, "Webhook GHN đã xử lý."));
    }
}

// Payload webhook GHTK (form-urlencoded).
public class GhtkWebhookForm
{
    [FromForm(Name = "partner_id")] public string? PartnerId { get; set; }
    [FromForm(Name = "label_id")]   public string? LabelId   { get; set; }
    [FromForm(Name = "status_id")]  public int?    StatusId  { get; set; }
    [FromForm(Name = "action_time")] public string? ActionTime { get; set; }
    [FromForm(Name = "reason_code")] public string? ReasonCode { get; set; }
    [FromForm(Name = "reason")]     public string? Reason    { get; set; }
    [FromForm(Name = "weight")]     public decimal? Weight   { get; set; }
    [FromForm(Name = "fee")]        public decimal? Fee      { get; set; }
    [FromForm(Name = "pick_money")] public decimal? PickMoney { get; set; }
}
