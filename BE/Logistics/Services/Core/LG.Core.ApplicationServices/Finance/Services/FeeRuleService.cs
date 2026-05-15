using AutoMapper;
using LG.ApplicationBase.Localization;
using Microsoft.Extensions.Logging;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.FeeRule;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class FeeRuleService : CoreServiceBase, IFeeRuleService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public FeeRuleService(
            CoreDbContext db, 
            IMapper mapper, 
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<FeeRuleService> logger) 
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<FeeRuleDto>> GetAllAsync()
        {
            var rules = await _db.FeeRules.OrderByDescending(x => x.IsActive).ToListAsync();
            return _mapper.Map<List<FeeRuleDto>>(rules);
        }

        public async Task<FeeRuleDto> GetByIdAsync(Guid id)
        {
            var rule = await _db.FeeRules.FindAsync(id);
            return _mapper.Map<FeeRuleDto>(rule);
        }

        public async Task<FeeRuleDto> CreateAsync(CreateFeeRuleDto dto)
        {
            var rule = _mapper.Map<FeeRule>(dto);
            _db.FeeRules.Add(rule);
            await _db.SaveChangesAsync();
            return _mapper.Map<FeeRuleDto>(rule);
        }

        public async Task<bool> UpdateAsync(Guid id, CreateFeeRuleDto dto)
        {
            var rule = await _db.FeeRules.FindAsync(id);
            if (rule == null) return false;

            _mapper.Map(dto, rule);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var rule = await _db.FeeRules.FindAsync(id);
            if (rule == null) return false;

            _db.FeeRules.Remove(rule);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
