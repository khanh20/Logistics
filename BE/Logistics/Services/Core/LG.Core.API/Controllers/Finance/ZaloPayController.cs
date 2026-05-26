using LG.Core.ApplicationServices.Finance.DTOs.ZaloPay;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/zalopay")]
    public class ZaloPayController : CoreBaseController
    {
        private readonly IZaloPayService _zaloPayService;
        private readonly CoreDbContext _db;
        private readonly ILogger<ZaloPayController> _logger;

        public ZaloPayController(IZaloPayService zaloPayService, CoreDbContext db, ILogger<ZaloPayController> logger)
        {
            _zaloPayService = zaloPayService;
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Tạo link thanh toán ZaloPay (Frontend gọi sau khi đã có TopupRequest)
        /// </summary>
        [HttpPost("create-payment/{topupId}")]
        [Authorize]
        public async Task<IActionResult> CreatePayment(Guid topupId)
        {
            var topup = await _db.TopupRequests.FindAsync(topupId);
            if (topup == null)
                return NotFound(new { message = "Không tìm thấy yêu cầu nạp tiền." });

            if (topup.Status != TopupStatusEnum.Pending)
                return BadRequest(new { message = "Yêu cầu nạp tiền này đã được xử lý hoặc hết hạn." });

            var result = await _zaloPayService.CreatePaymentAsync(topup);

            if (result.ReturnCode != 1)
                return BadRequest(new { message = "Lỗi khi gọi API ZaloPay.", details = result.ReturnMessage });

            return Ok(new
            {
                payUrl = result.OrderUrl,
                zpTransToken = result.ZpTransToken,
                orderToken = result.OrderToken
            });
        }

        /// <summary>
        /// Webhook Callback – ZaloPay Server tự động gọi khi người dùng thanh toán thành công.
        /// KHÔNG đặt [Authorize] ở đây vì ZaloPay Server không có token của User.
        /// </summary>
        [HttpPost("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> Callback([FromBody] System.Text.Json.JsonElement request)
        {
            try
            {
                var jsonString = request.GetRawText();
                _logger.LogInformation("ZaloPay Callback Raw: {Json}", jsonString);

                var jsonDoc = System.Text.Json.JsonDocument.Parse(jsonString);
                var data = jsonDoc.RootElement.GetProperty("data").GetString() ?? ""; 
                var mac = jsonDoc.RootElement.GetProperty("mac").GetString() ?? "";

                var callbackDto = new ZaloPayCallbackDto { Data = data, Mac = mac };
                var success = await _zaloPayService.ProcessCallbackAsync(callbackDto);

                if (!success)
                    return base.Ok(new { return_code = -1, return_message = "Xác thực chữ ký thất bại" });

                return base.Ok(new { return_code = 1, return_message = "success" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Lỗi xử lý callback: {ex.Message}");
                return base.Ok(new { return_code = -1, return_message = ex.Message });
            }
        }
    }
}
