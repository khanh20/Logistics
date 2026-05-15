using LG.Core.ApplicationServices.Finance.DTOs.VipTier;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface IVipTierService
    {
        Task<List<VipTierDto>> GetAllAsync();
        Task<VipTierDto> GetByIdAsync(Guid id);
        Task<VipTierDto> CreateAsync(CreateVipTierDto dto);
        Task<bool> UpdateAsync(Guid id, CreateVipTierDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
