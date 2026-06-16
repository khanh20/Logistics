using LG.Core.ApplicationServices.Finance.DTOs.CustomerProfile;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Shared.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [Authorize]
    public class CustomerProfileController : CoreBaseController
    {
        private readonly ICustomerProfileService _service;

        public CustomerProfileController(ICustomerProfileService service)
        {
            _service = service;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var userId = CurrentUserId;
            var profile = await _service.GetByUserIdAsync(userId);
            if (profile == null) return NotFound();
            return Ok(profile);
        }

        [HttpPost("me")]
        public async Task<IActionResult> CreateMyProfile(CreateCustomerProfileDto dto)
        {
            var userId = CurrentUserId;
            try
            {
                var result = await _service.CreateAsync(dto, userId);
                return Created(result, "Tạo profile thành công.");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(Guid id, UpdateCustomerProfileDto dto)
        {
            var result = await _service.UpdateAsync(id, dto);
            if (!result) return NotFound();
            return Ok<object?>(null, "Cập nhật profile thành công.");
        }
    }
}
