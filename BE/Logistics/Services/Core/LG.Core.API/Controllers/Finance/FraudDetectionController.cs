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
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class FraudDetectionController : CoreBaseController
    {
        private readonly IFraudDetectionService _service;

        public FraudDetectionController(IFraudDetectionService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("{id}/review")]
        public async Task<IActionResult> Review(Guid id, ReviewFraudDto dto)
        {
            var adminId = CurrentUserId;
            var result = await _service.ReviewAsync(id, dto, adminId);
            if (!result) return NotFound();
            return Ok<object?>(null, "Đã review thành công.");
        }
    }
}
