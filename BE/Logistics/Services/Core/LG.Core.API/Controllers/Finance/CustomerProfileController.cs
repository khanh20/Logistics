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
    [ApiController]
    [Authorize]
    public class CustomerProfileController : ControllerBase
    {
        private readonly ICustomerProfileService _service;

        public CustomerProfileController(ICustomerProfileService service)
        {
            _service = service;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        [HttpGet("me")]
        public async Task<ActionResult<CustomerProfileDto>> GetMyProfile()
        {
            var userId = GetCurrentUserId();
            var profile = await _service.GetByUserIdAsync(userId);
            if (profile == null) return NotFound();
            return Ok(profile);
        }

        [HttpPost("me")]
        public async Task<ActionResult<CustomerProfileDto>> CreateMyProfile(CreateCustomerProfileDto dto)
        {
            var userId = GetCurrentUserId();
            try
            {
                var result = await _service.CreateAsync(dto, userId);
                return CreatedAtAction(nameof(GetMyProfile), new { }, result);
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
            return NoContent();
        }
    }
}
