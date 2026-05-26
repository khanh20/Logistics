using LG.Core.ApplicationServices.Finance.DTOs.Transaction;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LG.Shared.Common;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/transactions")]
    [Authorize] // Yêu cầu đăng nhập
    public class TransactionController : CoreBaseController
    {
        private readonly ITransactionService _transactionService;

        public TransactionController(ITransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        /// <summary>
        /// Tạo yêu cầu nạp tiền mới
        /// </summary>
        [HttpPost("topup")]
        public async Task<IActionResult> CreateTopup([FromBody] CreateTopupDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = CurrentUserId;
            var result = await _transactionService.CreateTopupRequestAsync(request, userId);
            return Ok(result, "Tạo yêu cầu nạp tiền thành công.");
        }

        /// <summary>
        /// Xem thông tin ví của mình
        /// </summary>
        [HttpGet("my-wallet")]
        public async Task<IActionResult> GetMyWallet()
        {
            var userId = CurrentUserId;
            var result = await _transactionService.GetMyWalletAsync(userId);
            return Ok(result);
        }

        /// <summary>
        /// Lấy lịch sử nạp tiền của mình
        /// </summary>
        [HttpGet("my-topups")]
        public async Task<IActionResult> GetMyTopups()
        {
            var userId = CurrentUserId;
            var results = await _transactionService.GetMyTopupsAsync(userId);
            return Ok(results);
        }

        /// <summary>
        /// Tạo lệnh rút tiền (Sẽ đóng băng số dư chờ duyệt)
        /// </summary>
        [HttpPost("withdraw")]
        public async Task<IActionResult> CreateWithdraw([FromBody] CreateWithdrawDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = CurrentUserId;
            var result = await _transactionService.CreateWithdrawRequestAsync(request, userId);
            return Ok(result, "Tạo lệnh rút tiền thành công. Số dư đã được đóng băng chờ duyệt.");
        }

        /// <summary>
        /// Lấy lịch sử rút tiền của tôi
        /// </summary>
        [HttpGet("my-withdraws")]
        public async Task<IActionResult> GetMyWithdraws()
        {
            var userId = CurrentUserId;
            var results = await _transactionService.GetMyWithdrawsAsync(userId);
            return Ok(results);
        }
    }
}
