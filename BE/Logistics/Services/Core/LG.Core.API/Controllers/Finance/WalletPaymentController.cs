using LG.Core.ApplicationServices.Finance.DTOs.WalletPayment;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [ApiController]
    [Route("api/wallet-payment")]
    [AllowAnonymous] // Cho phép gọi service-to-service internal hoặc từ Module1
    public class WalletPaymentController : CoreBaseController
    {
        private readonly IWalletPaymentService _walletPaymentService;

        public WalletPaymentController(IWalletPaymentService walletPaymentService)
        {
            _walletPaymentService = walletPaymentService;
        }

        [HttpGet("balance/{customerId}")]
        public async Task<IActionResult> GetBalance(Guid customerId)
        {
            var balance = await _walletPaymentService.GetBalanceAsync(customerId);
            return Ok(balance);
        }

        [HttpPost("deduct")]
        public async Task<IActionResult> Deduct([FromBody] WalletDeductRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.DeductAsync(request);
            return Ok(result, "Trừ tiền ví thành công.");
        }

        [HttpPost("refund")]
        public async Task<IActionResult> Refund([FromBody] WalletRefundRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.RefundAsync(request);
            return Ok(result, "Hoàn tiền ví thành công.");
        }

        [HttpPost("calculate-checkout-fees")]
        public async Task<IActionResult> CalculateCheckoutFees([FromBody] CalculateFeesRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.CalculateCheckoutFeesAsync(request);
            return Ok(result);
        }

        [HttpPost("calculate-shipping-fees")]
        public async Task<IActionResult> CalculateShippingFees([FromBody] CalculateShippingFeesRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _walletPaymentService.CalculateShippingFeesAsync(request);
            return Ok(result);
        }
    }
}
