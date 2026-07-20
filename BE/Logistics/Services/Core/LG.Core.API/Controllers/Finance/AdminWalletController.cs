using LG.Core.ApplicationServices.Finance.DTOs.Wallet;
using LG.Core.ApplicationServices.Finance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace LG.Core.API.Controllers.Finance
{
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AdminWalletController : CoreBaseController
    {
        private readonly IAdminWalletService _service;

        public AdminWalletController(IAdminWalletService service)
        {
            _service = service;
        }

        [HttpGet("frozen")]
        public async Task<IActionResult> GetFrozenWallets()
        {
            var result = await _service.GetFrozenWalletsAsync();
            return Ok(result);
        }

        [HttpPut("{id}/unlock")]
        public async Task<IActionResult> UnlockWallet(Guid id, [FromBody] UnlockWalletDto dto)
        {
            var adminId = CurrentUserId;
            var result = await _service.UnlockWalletAsync(id, adminId, dto.Reason);
            if (!result) return BadRequest("Ví không tồn tại hoặc không bị khóa.");
            return Ok<object?>(null, "Đã mở khóa ví thành công.");
        }

        [HttpPut("{id}/toggle-trust")]
        public async Task<IActionResult> ToggleTrustWallet(Guid id)
        {
            var adminId = CurrentUserId;
            var result = await _service.ToggleTrustAsync(id, adminId);
            if (!result) return BadRequest("Ví không tồn tại.");
            return Ok<object?>(null, "Đã thay đổi trạng thái tin cậy của ví.");
        }
    }
}
