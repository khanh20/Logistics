using LG.Core.ApplicationServices.Finance.DTOs.FeeRule;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    public class FeeRuleController : CoreBaseController
    {
        private readonly IFeeRuleService _feeRuleService;

        public FeeRuleController(IFeeRuleService feeRuleService)
        {
            _feeRuleService = feeRuleService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _feeRuleService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _feeRuleService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateFeeRuleDto dto)
        {
            var result = await _feeRuleService.CreateAsync(dto);
            return Created(result, "Tạo fee rule thành công.");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, CreateFeeRuleDto dto)
        {
            var result = await _feeRuleService.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return Ok<object?>(null, "Cập nhật thành công.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _feeRuleService.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok<object?>(null, "Xóa thành công.");
        }
    }
}
