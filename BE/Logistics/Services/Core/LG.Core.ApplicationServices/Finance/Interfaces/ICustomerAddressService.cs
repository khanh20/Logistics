using LG.Core.ApplicationServices.Finance.DTOs.CustomerAddress;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Interfaces
{
    public interface ICustomerAddressService
    {
        Task<List<CustomerAddressDto>> GetByCustomerIdAsync(Guid customerId);
        Task<CustomerAddressDto> CreateAsync(CreateCustomerAddressDto dto, Guid customerId);
        Task<bool> UpdateAsync(Guid id, UpdateCustomerAddressDto dto);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> SetDefaultAsync(Guid id, Guid customerId);
    }
}
