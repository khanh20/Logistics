using LG.Core.ApplicationServices.Finance.DTOs.CustomerAddress;
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
    [Authorize]
    public class CustomerAddressController : ControllerBase
    {
        private readonly ICustomerAddressService _service;

        public CustomerAddressController(ICustomerAddressService service)
        {
            _service = service;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        [HttpGet("me")]
        public async Task<ActionResult<List<CustomerAddressDto>>> GetMyAddresses()
        {
            var userId = GetCurrentUserId();
            var addresses = await _service.GetByCustomerIdAsync(userId);
            return Ok(addresses);
        }

        [HttpPost]
        public async Task<ActionResult<CustomerAddressDto>> Create(CreateCustomerAddressDto dto)
        {
            var userId = GetCurrentUserId();
            var result = await _service.CreateAsync(dto, userId);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateCustomerAddressDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpPatch("{id}/set-default")]
        public async Task<IActionResult> SetDefault(Guid id)
        {
            var userId = GetCurrentUserId();
            var result = await _service.SetDefaultAsync(id, userId);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
