using LG.Core.ApplicationServices.Finance.DTOs.FraudDetection;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Shared.Common;
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
    public class FraudDetectionController : ControllerBase
    {
        private readonly IFraudDetectionService _service;

        public FraudDetectionController(IFraudDetectionService service)
        {
            _service = service;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        [HttpGet]
        public async Task<ActionResult<List<FraudDetectionDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FraudDetectionDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("{id}/review")]
        public async Task<IActionResult> Review(Guid id, ReviewFraudDto dto)
        {
            var adminId = GetCurrentUserId();
            var result = await _service.ReviewAsync(id, dto, adminId);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
