using LG.Core.ApplicationServices.Finance.DTOs.Transaction;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface ITransactionService
    {
        // Giao dịch nạp tiền
        Task<TopupResponseDto> CreateTopupRequestAsync(CreateTopupDto dto, Guid currentUserId);
        Task<List<TopupResponseDto>> GetMyTopupsAsync(Guid currentUserId);
        Task<WalletDto> GetMyWalletAsync(Guid currentUserId);

        // Giao dịch rút tiền (User)
        Task<WithdrawResponseDto> CreateWithdrawRequestAsync(CreateWithdrawDto dto, Guid currentUserId);
        Task<List<WithdrawResponseDto>> GetMyWithdrawsAsync(Guid currentUserId);

        // Quản lý rút tiền (Admin)
        Task<List<WithdrawResponseDto>> GetPendingWithdrawsAsync();
        Task<bool> ApproveWithdrawAsync(Guid withdrawId, Guid adminId, string? transferRef);
        Task<bool> RejectWithdrawAsync(Guid withdrawId, Guid adminId, string reason);
    }
}
