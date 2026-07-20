using LG.Core.ApplicationServices.Finance.DTOs.Wallet;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IAdminWalletService
    {
        Task<List<FrozenWalletDto>> GetFrozenWalletsAsync();
        Task<bool> UnlockWalletAsync(Guid walletId, Guid adminId, string reason);
        Task<bool> ToggleTrustAsync(Guid walletId, Guid adminId);
    }
}
