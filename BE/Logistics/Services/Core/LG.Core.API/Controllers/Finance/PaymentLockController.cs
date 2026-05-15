using LG.Core.ApplicationServices.Finance.DTOs.PaymentLock;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class PaymentLockController : ControllerBase
    {
        private readonly IPaymentLockService _service;

        public PaymentLockController(IPaymentLockService service)
        {
            _service = service;
        }

        [HttpGet("order/{orderId}")]
        public async Task<ActionResult<List<PaymentLockDto>>> GetByOrder(Guid orderId)
        {
            return Ok(await _service.GetByOrderIdAsync(orderId));
        }

        [HttpPost]
        public async Task<ActionResult<PaymentLockDto>> Create(CreatePaymentLockDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPost("{id}/release")]
        public async Task<IActionResult> Release(Guid id, [FromQuery] ReleaseReasonEnum reason)
        {
            var result = await _service.ReleaseAsync(id, reason);
            if (!result) return BadRequest("Cannot release payment lock.");
            return NoContent();
        }
    }
}
