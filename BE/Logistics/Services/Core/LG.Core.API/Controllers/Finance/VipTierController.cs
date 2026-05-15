using LG.Core.ApplicationServices.Finance.DTOs.VipTier;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LG.Shared.Common;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [ApiController]
    public class VipTierController : ControllerBase
    {
        private readonly IVipTierService _vipTierService;

        public VipTierController(IVipTierService vipTierService)
        {
            _vipTierService = vipTierService;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        [HttpGet]
        public async Task<ActionResult<List<VipTierDto>>> GetAll()
        {
            return Ok(await _vipTierService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<VipTierDto>> GetById(Guid id)
        {
            var result = await _vipTierService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<VipTierDto>> Create(CreateVipTierDto dto)
        {
            var result = await _vipTierService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Update(Guid id, CreateVipTierDto dto)
        {
            var result = await _vipTierService.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _vipTierService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
