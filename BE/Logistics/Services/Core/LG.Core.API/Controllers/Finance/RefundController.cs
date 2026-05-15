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
    [ApiController]
    // [Authorize] // Uncomment when testing security
    public class RefundController : ControllerBase
    {
        private readonly IRefundService _refundService;

        public RefundController(IRefundService refundService)
        {
            _refundService = refundService;
        }

        [HttpGet]
        public async Task<ActionResult<List<RefundDto>>> GetAll()
        {
            return Ok(await _refundService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RefundDto>> GetById(Guid id)
        {
            var result = await _refundService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("request")]
        public async Task<ActionResult<RefundDto>> CreateRequest(CreateRefundDto dto)
        {
            var result = await _refundService.CreateRefundRequestAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPost("{id}/approve")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Approve(Guid id)
        {
            var result = await _refundService.ApproveRefundAsync(id);
            if (!result) return BadRequest("Không thể duyệt yêu cầu hoàn tiền này.");
            return Ok("Duyệt hoàn tiền thành công.");
        }

        [HttpPost("{id}/reject")]
        // [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] string reason)
        {
            var result = await _refundService.RejectRefundAsync(id, reason);
            if (!result) return BadRequest("Không thể từ chối yêu cầu hoàn tiền này.");
            return Ok("Đã từ chối hoàn tiền.");
        }
    }
}
