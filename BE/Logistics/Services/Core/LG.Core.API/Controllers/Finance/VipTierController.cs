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
    public class VipTierController : CoreBaseController
    {
        private readonly IVipTierService _vipTierService;

        public VipTierController(IVipTierService vipTierService)
        {
            _vipTierService = vipTierService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _vipTierService.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _vipTierService.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Create(CreateVipTierDto dto)
        {
            var result = await _vipTierService.CreateAsync(dto);
            return Created(result, "Tạo VIP tier thành công.");
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Update(Guid id, CreateVipTierDto dto)
        {
            var result = await _vipTierService.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return Ok<object?>(null, "Cập nhật thành công.");
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _vipTierService.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok<object?>(null, "Xóa thành công.");
        }
    }
}
