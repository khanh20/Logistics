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
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class PaymentLockController : CoreBaseController
    {
        private readonly IPaymentLockService _service;

        public PaymentLockController(IPaymentLockService service)
        {
            _service = service;
        }

        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetByOrder(Guid orderId)
        {
            return Ok(await _service.GetByOrderIdAsync(orderId));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreatePaymentLockDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Created(result, "Tạo payment lock thành công.");
        }

        [HttpPost("{id}/release")]
        public async Task<IActionResult> Release(Guid id, [FromQuery] ReleaseReasonEnum reason)
        {
            var result = await _service.ReleaseAsync(id, reason);
            if (!result) return BadRequest("Cannot release payment lock.");
            return Ok<object?>(null, "Release thành công.");
        }
    }
}
