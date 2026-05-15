using LG.Shared.Constants;
using LG.Core.ApplicationServices.Finance.DTOs.BankAccount;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Untils.EnumFinance;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LG.Shared.Common;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/bank-accounts")]
    [ApiController]
    [Authorize] // Yêu cầu đăng nhập
    public class BankAccountController : ControllerBase
    {
        private readonly IBankAccountService _bankAccountService;

        public BankAccountController(IBankAccountService bankAccountService)
        {
            _bankAccountService = bankAccountService;
        }

        private Guid GetCurrentUserId() => HttpContext.GetCurrentUserId();

        /// <summary>
        /// Thêm mới tài khoản ngân hàng (Tự động gán Type = System nếu là Admin, ngược lại là Customer)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateBankAccount([FromBody] CreateBankAccountDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var type = User.IsInRole("Admin") ? BankAccountType.System : BankAccountType.Customer;
            
            var result = await _bankAccountService.CreateAsync(request, userId, type);
            
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// Lấy thông tin chi tiết tài khoản ngân hàng theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var account = await _bankAccountService.GetByIdAsync(id);
            if (account == null)
                throw new CoreException(CoreErrorCode.CoreBankAccountNotFound, 404);

            return Ok(account);
        }

        /// <summary>
        /// Lấy danh sách tài khoản ngân hàng của Hệ thống (để khách hàng chuyển khoản vào)
        /// </summary>
        [HttpGet("system")]
        public async Task<IActionResult> GetSystemBankAccounts()
        {
            var accounts = await _bankAccountService.GetSystemBankAccountsAsync();
            return Ok(accounts);
        }

        /// <summary>
        /// Lấy danh sách tài khoản ngân hàng của chính Khách hàng (để rút tiền ra)
        /// </summary>
        [HttpGet("my")]
        public async Task<IActionResult> GetCustomerBankAccounts()
        {
            var userId = GetCurrentUserId();
            var accounts = await _bankAccountService.GetCustomerBankAccountsAsync(userId);
            return Ok(accounts);
        }

        /// <summary>
        /// Bật/Tắt trạng thái hoạt động của tài khoản
        /// </summary>
        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(Guid id)
        {
            var success = await _bankAccountService.ToggleActiveStatusAsync(id);
            if (!success)
                throw new CoreException(CoreErrorCode.CoreBankAccountNotFound, 404);

            return Ok(ApiResponse.Ok("Cập nhật trạng thái thành công."));
        }

        /// <summary>
        /// Xóa tài khoản ngân hàng
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBankAccount(Guid id)
        {
            var success = await _bankAccountService.DeleteAsync(id);
            if (!success)
                throw new CoreException(CoreErrorCode.CoreBankAccountNotFound, 404);

            return Ok(ApiResponse.Ok("Đã xóa tài khoản ngân hàng."));
        }
    }
}
