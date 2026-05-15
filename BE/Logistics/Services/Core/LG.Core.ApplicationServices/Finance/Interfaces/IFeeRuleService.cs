using LG.Core.ApplicationServices.Finance.DTOs.FeeRule;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IFeeRuleService
    {
        Task<List<FeeRuleDto>> GetAllAsync();
        Task<FeeRuleDto> GetByIdAsync(Guid id);
        Task<FeeRuleDto> CreateAsync(CreateFeeRuleDto dto);
        Task<bool> UpdateAsync(Guid id, CreateFeeRuleDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
