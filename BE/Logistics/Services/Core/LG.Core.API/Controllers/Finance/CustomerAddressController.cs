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
    [Authorize]
    public class CustomerAddressController : CoreBaseController
    {
        private readonly ICustomerAddressService _service;

        public CustomerAddressController(ICustomerAddressService service)
        {
            _service = service;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyAddresses()
        {
            var userId = CurrentUserId;
            var addresses = await _service.GetByCustomerIdAsync(userId);
            return Ok(addresses);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateCustomerAddressDto dto)
        {
            var userId = CurrentUserId;
            var result = await _service.CreateAsync(dto, userId);
            return Created(result, "Tạo địa chỉ thành công.");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateCustomerAddressDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return Ok<object?>(null, "Cập nhật địa chỉ thành công.");
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var result = await _service.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok<object?>(null, "Xóa địa chỉ thành công.");
        }

        [HttpPatch("{id}/set-default")]
        public async Task<IActionResult> SetDefault(Guid id)
        {
            var userId = CurrentUserId;
            var result = await _service.SetDefaultAsync(id, userId);
            if (!result) return NotFound();
            return Ok<object?>(null, "Đặt địa chỉ mặc định thành công.");
        }
    }
}
