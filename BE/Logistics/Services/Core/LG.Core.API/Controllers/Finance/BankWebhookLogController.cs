using LG.Core.ApplicationServices.Finance.DTOs.BankWebhookLog;
using LG.Core.ApplicationServices.Finance.Interfaces;
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
    public class BankWebhookLogController : ControllerBase
    {
        private readonly IBankWebhookLogService _service;

        public BankWebhookLogController(IBankWebhookLogService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<BankWebhookLogDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BankWebhookLogDto>> GetById(Guid id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }
    }
}
