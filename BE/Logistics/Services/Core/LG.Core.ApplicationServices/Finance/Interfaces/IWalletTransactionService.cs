using LG.Core.ApplicationServices.Finance.DTOs.WalletTransaction;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IWalletTransactionService
    {
        Task<List<WalletTransactionDto>> GetByWalletAsync(Guid walletId);
        Task<List<WalletTransactionDto>> GetAllAsync();
    }
}
