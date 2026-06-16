using LG.Core.ApplicationServices.Finance.DTOs.TransactionType;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface ITransactionTypeService
    {
        Task<List<TransactionTypeDto>> GetAllAsync();
        Task<TransactionTypeDto?> GetByIdAsync(Guid id);
        Task<TransactionTypeDto> CreateAsync(CreateTransactionTypeDto dto);
        Task<bool> UpdateAsync(UpdateTransactionTypeDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
