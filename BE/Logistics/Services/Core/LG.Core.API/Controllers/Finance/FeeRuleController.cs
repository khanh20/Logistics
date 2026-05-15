using LG.Core.ApplicationServices.Finance.DTOs.FeeRule;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [ApiController]
    public class FeeRuleController : ControllerBase
    {
        private readonly IFeeRuleService _feeRuleService;

        public FeeRuleController(IFeeRuleService feeRuleService)
        {
            _feeRuleService = feeRuleService;
        }

        [HttpGet]
        public async Task<ActionResult<List<FeeRuleDto>>> GetAll()
        {
            return Ok(await _feeRuleService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FeeRuleDto>> GetById(Guid id)
        {
            var result = await _feeRuleService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<FeeRuleDto>> Create(CreateFeeRuleDto dto)
        {
            var result = await _feeRuleService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CreateFeeRuleDto dto)
        {
            var result = await _feeRuleService.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _feeRuleService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
