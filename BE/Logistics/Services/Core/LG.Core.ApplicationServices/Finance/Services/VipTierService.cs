using AutoMapper;
using LG.ApplicationBase.Localization;
using Microsoft.Extensions.Logging;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.VipTier;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class VipTierService : CoreServiceBase, IVipTierService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public VipTierService(
            CoreDbContext db, 
            IMapper mapper, 
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<VipTierService> logger) 
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<VipTierDto>> GetAllAsync()
        {
            var tiers = await _db.VipTiers.OrderBy(x => x.Level).ToListAsync();
            return _mapper.Map<List<VipTierDto>>(tiers);
        }

        public async Task<VipTierDto> GetByIdAsync(Guid id)
        {
            var tier = await _db.VipTiers.FindAsync(id);
            return _mapper.Map<VipTierDto>(tier);
        }

        public async Task<VipTierDto> CreateAsync(CreateVipTierDto dto)
        {
            var tier = _mapper.Map<VipTier>(dto);
            _db.VipTiers.Add(tier);
            await _db.SaveChangesAsync();
            return _mapper.Map<VipTierDto>(tier);
        }

        public async Task<bool> UpdateAsync(Guid id, CreateVipTierDto dto)
        {
            var tier = await _db.VipTiers.FindAsync(id);
            if (tier == null) return false;

            _mapper.Map(dto, tier);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var tier = await _db.VipTiers.FindAsync(id);
            if (tier == null) return false;

            _db.VipTiers.Remove(tier);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
