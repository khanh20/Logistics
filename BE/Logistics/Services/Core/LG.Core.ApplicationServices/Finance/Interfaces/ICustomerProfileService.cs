using LG.Core.ApplicationServices.Finance.DTOs.CustomerProfile;
using System;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface ICustomerProfileService
    {
        Task<CustomerProfileDto?> GetByUserIdAsync(Guid userId);
        Task<CustomerProfileDto> CreateAsync(CreateCustomerProfileDto dto, Guid userId);
        Task<bool> UpdateAsync(Guid id, UpdateCustomerProfileDto dto);
    }
}
