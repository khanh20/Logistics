using LG.Core.ApplicationServices.Finance.DTOs.Management;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IFinanceManagementService
    {
        // Credit Limit
        Task<CreditLimitDto> GetCreditLimitByWalletAsync(Guid walletId);
        Task<CreditLimitDto> UpdateCreditLimitAsync(UpdateCreditLimitDto dto);

        // Debt Records
        Task<List<DebtRecordDto>> GetDebtsByWalletAsync(Guid walletId);
        Task<bool> PayDebtAsync(Guid debtId, decimal amount);
    }
}
