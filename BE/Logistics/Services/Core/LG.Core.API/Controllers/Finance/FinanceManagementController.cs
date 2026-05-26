using LG.Core.ApplicationServices.Finance.DTOs.Management;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    public class FinanceManagementController : CoreBaseController
    {
        private readonly IFinanceManagementService _financeService;

        public FinanceManagementController(IFinanceManagementService financeService)
        {
            _financeService = financeService;
        }

        [HttpGet("credit-limit/{walletId}")]
        public async Task<IActionResult> GetCreditLimit(Guid walletId)
        {
            var result = await _financeService.GetCreditLimitByWalletAsync(walletId);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("credit-limit")]
        public async Task<IActionResult> UpdateCreditLimit(UpdateCreditLimitDto dto)
        {
            return Ok(await _financeService.UpdateCreditLimitAsync(dto));
        }

        [HttpGet("debts/{walletId}")]
        public async Task<IActionResult> GetDebts(Guid walletId)
        {
            return Ok(await _financeService.GetDebtsByWalletAsync(walletId));
        }

        [HttpPost("pay-debt/{debtId}")]
        public async Task<IActionResult> PayDebt(Guid debtId, [FromBody] decimal amount)
        {
            var result = await _financeService.PayDebtAsync(debtId, amount);
            if (!result) return BadRequest("Không thể thanh toán khoản nợ này.");
            return Ok<object?>(null, "Thanh toán nợ thành công.");
        }
    }
}
