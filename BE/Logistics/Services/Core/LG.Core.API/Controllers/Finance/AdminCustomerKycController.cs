using System;
using System.Threading.Tasks;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/admin/kyc")]
    [Authorize]
    public class AdminCustomerKycController : CoreBaseController
    {
        private readonly ICustomerKycService _kycService;

        public AdminCustomerKycController(ICustomerKycService kycService)
        {
            _kycService = kycService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllKycs()
        {
            var kycs = await _kycService.GetAllKycsAsync();
            return Ok(kycs);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveKyc(Guid id)
        {
            var result = await _kycService.ApproveKycAsync(id, CurrentUserId);
            return Ok(result);
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectKyc(Guid id, [FromBody] RejectKycRequest request)
        {
            var result = await _kycService.RejectKycAsync(id, CurrentUserId, request.Reason);
            return Ok(result);
        }
    }

    public class RejectKycRequest
    {
        public string Reason { get; set; } = string.Empty;
    }
}
