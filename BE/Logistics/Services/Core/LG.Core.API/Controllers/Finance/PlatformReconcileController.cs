using LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile;
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
    public class PlatformReconcileController : ControllerBase
    {
        private readonly IPlatformReconcileService _service;

        public PlatformReconcileController(IPlatformReconcileService service)
        {
            _service = service;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        [HttpGet]
        public async Task<ActionResult<List<PlatformReconcileDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpPost]
        public async Task<ActionResult<PlatformReconcileDto>> Create(CreatePlatformReconcileDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> Confirm(Guid id)
        {
            var adminId = GetCurrentUserId();
            var result = await _service.ConfirmAsync(id, adminId);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
