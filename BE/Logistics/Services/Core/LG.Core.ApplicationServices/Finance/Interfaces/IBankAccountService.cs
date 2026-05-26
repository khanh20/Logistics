using LG.Core.ApplicationServices.Finance.DTOs.BankAccount;
using LG.Untils.EnumFinance;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IBankAccountService
    {
        Task<BankAccountDto?> GetByIdAsync(Guid id);
        Task<BankAccountDto> CreateAsync(CreateBankAccountDto dto, Guid? currentUserId, BankAccountType type);
        Task<List<BankAccountDto>> GetSystemBankAccountsAsync(bool activeOnly = true);
        Task<List<BankAccountDto>> GetCustomerBankAccountsAsync(Guid userId);
        Task<bool> ToggleActiveStatusAsync(Guid id);
        Task<bool> DeleteAsync(Guid id);
    }
}
