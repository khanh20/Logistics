using LG.Core.ApplicationServices.Finance.DTOs.Refund;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    // [Authorize] // Uncomment when testing security
    public class RefundController : CoreBaseController
    {
        private readonly IRefundService _refundService;

        public RefundController(IRefundService refundService)
        {
            _refundService = refundService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _refundService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _refundService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("request")]
        public async Task<IActionResult> CreateRequest(CreateRefundDto dto)
        {
            var result = await _refundService.CreateRefundRequestAsync(dto);
            return Created(result, "Tạo yêu cầu hoàn tiền thành công.");
        }

        [HttpPost("{id}/approve")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(Guid id)
        {
            var result = await _refundService.ApproveRefundAsync(id);
            if (!result) return BadRequest("Không thể duyệt yêu cầu hoàn tiền này.");
            return Ok<object?>(null, "Duyệt hoàn tiền thành công.");
        }

        [HttpPost("{id}/reject")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] string reason)
        {
            var result = await _refundService.RejectRefundAsync(id, reason);
            if (!result) return BadRequest("Không thể từ chối yêu cầu hoàn tiền này.");
            return Ok<object?>(null, "Đã từ chối hoàn tiền.");
        }
    }
}
