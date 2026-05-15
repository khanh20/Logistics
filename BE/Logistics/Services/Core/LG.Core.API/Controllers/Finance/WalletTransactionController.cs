using LG.Core.ApplicationServices.Finance.DTOs.WalletTransaction;
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
    public class WalletTransactionController : ControllerBase
    {
        private readonly IWalletTransactionService _service;

        public WalletTransactionController(IWalletTransactionService service)
        {
            _service = service;
        }

        [HttpGet("wallet/{walletId}")]
        [Authorize(Roles = "Admin,SuperAdmin")] // Admin viewing specific wallet transactions
        public async Task<ActionResult<List<WalletTransactionDto>>> GetByWallet(Guid walletId)
        {
            return Ok(await _service.GetByWalletAsync(walletId));
        }

        [HttpGet]
        [Authorize(Roles = "Admin,SuperAdmin")]
        public async Task<ActionResult<List<WalletTransactionDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }
    }
}
