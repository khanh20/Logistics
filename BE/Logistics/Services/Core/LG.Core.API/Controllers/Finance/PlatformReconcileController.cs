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
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class PlatformReconcileController : CoreBaseController
    {
        private readonly IPlatformReconcileService _service;

        public PlatformReconcileController(IPlatformReconcileService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreatePlatformReconcileDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Created(result, "Tạo reconcile thành công.");
        }

        [HttpPost("{id}/confirm")]
        public async Task<IActionResult> Confirm(Guid id)
        {
            var adminId = CurrentUserId;
            var result = await _service.ConfirmAsync(id, adminId);
            if (!result) return NotFound();
            return Ok<object?>(null, "Confirm thành công.");
        }
    }
}
