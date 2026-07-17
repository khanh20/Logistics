using LG.Core.ApplicationServices.Finance.DTOs.WalletPayment;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [ApiController]
    [Route("api/wallet-payment")]
    [AllowAnonymous] // Cho phép gọi service-to-service internal, bảo mật bằng X-Internal-Key
    public class WalletPaymentController : CoreBaseController
    {
        private readonly IWalletPaymentService _walletPaymentService;
        private readonly IPaymentLockService _paymentLockService;
        private readonly IConfiguration _config;
        private const string InternalKeyHeader = "X-Internal-Key";

        public WalletPaymentController(IWalletPaymentService walletPaymentService, IPaymentLockService paymentLockService, IConfiguration config)
        {
            _walletPaymentService = walletPaymentService;
            _paymentLockService = paymentLockService;
            _config = config;
        }

        private bool IsValidInternalKey()
        {
            var expected = _config["Auth:InternalApiKey"] ?? Environment.GetEnvironmentVariable("AUTH__INTERNALAPIKEY");
            if (string.IsNullOrEmpty(expected)) return false;

            if (!Request.Headers.TryGetValue(InternalKeyHeader, out var provided))
                return false;

            var providedStr = provided.ToString();
            if (providedStr.Length != expected.Length) return false;

            return System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(providedStr),
                System.Text.Encoding.UTF8.GetBytes(expected));
        }

        [HttpGet("balance/{customerId}")]
        public async Task<IActionResult> GetBalance(Guid customerId)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            var balance = await _walletPaymentService.GetBalanceAsync(customerId);
            return Ok(balance);
        }

        [HttpPost("deduct")]
        public async Task<IActionResult> Deduct([FromBody] WalletDeductRequest request)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.DeductAsync(request);
            return Ok(result, "Trừ tiền ví thành công.");
        }

        [HttpPost("refund")]
        public async Task<IActionResult> Refund([FromBody] WalletRefundRequest request)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.RefundAsync(request);
            return Ok(result, "Hoàn tiền ví thành công.");
        }

        [HttpPost("lock")]
        public async Task<IActionResult> LockFunds([FromBody] LG.Core.ApplicationServices.Finance.DTOs.PaymentLock.CreatePaymentLockDto request)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _paymentLockService.CreateAsync(request);
                return Ok(result, "Khóa tiền thành công.");
            }
            catch (Exception ex)
            {
                // Log chi tiết lỗi để debug
                return StatusCode(500, new { success = false, message = ex.Message, innerError = ex.InnerException?.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPost("release-by-order/{orderId}")]
        public async Task<IActionResult> ReleaseByOrder(Guid orderId, [FromQuery] LG.Untils.EnumFinance.ReleaseReasonEnum reason)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            
            var result = await _paymentLockService.ReleaseByOrderIdAsync(orderId, reason);
            return Ok(result, "Nhả tiền thành công.");
        }

        [HttpPost("calculate-checkout-fees")]
        public async Task<IActionResult> CalculateCheckoutFees([FromBody] CalculateFeesRequest request)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.CalculateCheckoutFeesAsync(request);
            return Ok(result);
        }

        [HttpPost("calculate-shipping-fees")]
        public async Task<IActionResult> CalculateShippingFees([FromBody] CalculateShippingFeesRequest request)
        {
            if (!IsValidInternalKey()) return Unauthorized(new { success = false, message = "Invalid internal key." });
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.CalculateShippingFeesAsync(request);
            return Ok(result);
        }
    }
}
