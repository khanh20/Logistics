using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class EmailNotificationController : CoreBaseController
    {
        private readonly IEmailNotificationService _service;

        public EmailNotificationController(IEmailNotificationService service)
        {
            _service = service;
        }

        [HttpGet("customer/{customerId}")]
        public async Task<IActionResult> GetByCustomer(Guid customerId)
        {
            return Ok(await _service.GetByCustomerIdAsync(customerId));
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendNotification(SendEmailNotificationDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Created(result, "Gửi email thành công.");
        }
    }
}
