using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LG.Shared.Common;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/admin/transactions")]
    [Authorize(Roles = "Admin,SuperAdmin")] // Chỉ dành cho quản trị viên
    public class AdminTransactionController : CoreBaseController
    {
        private readonly ITransactionService _transactionService;

        public AdminTransactionController(ITransactionService transactionService)
        {
            _transactionService = transactionService;
        }

        public class ApproveWithdrawRequest
        {
            public string? TransferRef { get; set; } // Mã giao dịch ngân hàng thực tế admin đã chuyển
        }

        public class RejectWithdrawRequest
        {
            public string Reason { get; set; } = string.Empty; // Lý do từ chối
        }

        /// <summary>
        /// Danh sách các lệnh rút tiền đang chờ duyệt
        /// </summary>
        [HttpGet("withdraws/pending")]
        public async Task<IActionResult> GetPendingWithdraws()
        {
            var results = await _transactionService.GetPendingWithdrawsAsync();
            return Ok(results);
        }

        /// <summary>
        /// Duyệt lệnh rút tiền (Xác nhận đã chuyển khoản cho khách)
        /// </summary>
        [HttpPost("withdraws/{id}/approve")]
        public async Task<IActionResult> ApproveWithdraw(Guid id, [FromBody] ApproveWithdrawRequest request)
        {
            var adminId = CurrentUserId;
            var success = await _transactionService.ApproveWithdrawAsync(id, adminId, request.TransferRef);
            return Ok<object?>(null, "Đã duyệt lệnh rút tiền thành công.");
        }

        /// <summary>
        /// Từ chối lệnh rút tiền (Hoàn trả lại số dư vào ví cho khách)
        /// </summary>
        [HttpPost("withdraws/{id}/reject")]
        public async Task<IActionResult> RejectWithdraw(Guid id, [FromBody] RejectWithdrawRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { message = "Vui lòng nhập lý do từ chối." });

            var adminId = CurrentUserId;
            var success = await _transactionService.RejectWithdrawAsync(id, adminId, request.Reason);
            return Ok<object?>(null, "Đã từ chối lệnh rút tiền và hoàn tiền vào ví khách hàng.");
        }
    }
}
