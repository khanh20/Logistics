using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.CustomerAddress;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class CustomerAddressService : CoreServiceBase, ICustomerAddressService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public CustomerAddressService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<CustomerAddressService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<CustomerAddressDto>> GetByCustomerIdAsync(Guid customerId)
        {
            var addresses = await _db.CustomerAddresses
                .Where(x => x.CustomerId == customerId && !x.Deleted && x.IsActive)
                .ToListAsync();
            return _mapper.Map<List<CustomerAddressDto>>(addresses);
        }

        public async Task<CustomerAddressDto> CreateAsync(CreateCustomerAddressDto dto, Guid customerId)
        {
            if (dto.IsDefault)
            {
                await ClearDefaultAddressAsync(customerId);
            }

            var address = _mapper.Map<CustomerAddress>(dto);
            address.CustomerId = customerId;
            address.CreatedDate = DateTime.UtcNow;

            _db.CustomerAddresses.Add(address);
            await _db.SaveChangesAsync();

            return _mapper.Map<CustomerAddressDto>(address);
        }

        public async Task UpdateAsync(Guid id, UpdateCustomerAddressDto dto)
        {
            var address = await _db.CustomerAddresses.FindAsync(id);
            if (address == null || address.Deleted) 
                throw new CoreException(CoreErrorCode.CoreCustomerAddressNotFound);

            if (dto.IsDefault.HasValue && dto.IsDefault.Value)
            {
                await ClearDefaultAddressAsync(address.CustomerId);
            }

            _mapper.Map(dto, address);
            address.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var address = await _db.CustomerAddresses.FindAsync(id);
            if (address == null || address.Deleted) 
                throw new CoreException(CoreErrorCode.CoreCustomerAddressNotFound);

            address.Deleted = true;
            address.DeletedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        public async Task SetDefaultAsync(Guid id, Guid customerId)
        {
            var address = await _db.CustomerAddresses.FindAsync(id);
            if (address == null || address.CustomerId != customerId || address.Deleted) 
                throw new CoreException(CoreErrorCode.CoreCustomerAddressNotFound);

            await ClearDefaultAddressAsync(customerId);

            address.IsDefault = true;
            address.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        private async Task ClearDefaultAddressAsync(Guid customerId)
        {
            var currentDefaults = await _db.CustomerAddresses
                .Where(x => x.CustomerId == customerId && x.IsDefault && !x.Deleted)
                .ToListAsync();

            foreach (var def in currentDefaults)
            {
                def.IsDefault = false;
            }
        }
    }
}
