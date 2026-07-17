using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Shared.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [ApiController]
    [Route("api/finance/revenue")]
    [Authorize(Policy = Permissions.ReportManage)]
    public class RevenueController : CoreBaseController
    {
        private readonly IDailyRevenueService _revenueService;

        public RevenueController(IDailyRevenueService revenueService)
        {
            _revenueService = revenueService;
        }

        // POST /api/finance/revenue/generate?date=2024-05-20
        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromQuery] string date)
        {
            if (!DateOnly.TryParse(date, out var parsedDate))
                return BadRequest(ApiResponse.Fail("Invalid date format. Expected yyyy-MM-dd."));

            var report = await _revenueService.GenerateForDateAsync(parsedDate);
            return Ok(report);
        }

        // GET /api/finance/revenue/range?from=2024-05-01&to=2024-05-31
        [HttpGet("range")]
        public async Task<IActionResult> GetRange([FromQuery] string from, [FromQuery] string to)
        {
            if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
                return BadRequest(ApiResponse.Fail("Invalid date format. Expected yyyy-MM-dd."));

            var reports = await _revenueService.GetRangeAsync(fromDate, toDate);
            return Ok(reports);
        }
    }
}
