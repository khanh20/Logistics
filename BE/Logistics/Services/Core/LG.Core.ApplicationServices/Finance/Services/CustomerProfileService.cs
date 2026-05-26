using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.CustomerProfile;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class CustomerProfileService : CoreServiceBase, ICustomerProfileService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public CustomerProfileService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<CustomerProfileService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<CustomerProfileDto?> GetByUserIdAsync(Guid userId)
        {
            var profile = await _db.CustomerProfiles.FirstOrDefaultAsync(x => x.UserId == userId);
            return profile == null ? null : _mapper.Map<CustomerProfileDto>(profile);
        }

        public async Task<CustomerProfileDto> CreateAsync(CreateCustomerProfileDto dto, Guid userId)
        {
            var exists = await _db.CustomerProfiles.AnyAsync(x => x.UserId == userId);
            if (exists) throw new InvalidOperationException("Profile already exists for this user.");

            var profile = _mapper.Map<CustomerProfile>(dto);
            profile.UserId = userId;
            profile.CreatedDate = DateTime.UtcNow;

            _db.CustomerProfiles.Add(profile);
            await _db.SaveChangesAsync();

            return _mapper.Map<CustomerProfileDto>(profile);
        }

        public async Task<bool> UpdateAsync(Guid id, UpdateCustomerProfileDto dto)
        {
            try
            {
                var profile = await _db.CustomerProfiles.FindAsync(id);
                if (profile == null) return false;

                _mapper.Map(dto, profile);
                profile.ModifiedDate = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"UpdateAsync Error: {ex.Message} | Inner: {ex.InnerException?.Message}");
            }
        }
    }
}
