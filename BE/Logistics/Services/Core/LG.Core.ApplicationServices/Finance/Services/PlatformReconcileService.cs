using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.PlatformReconcile;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class PlatformReconcileService : CoreServiceBase, IPlatformReconcileService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public PlatformReconcileService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<PlatformReconcileService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<PlatformReconcileDto>> GetAllAsync()
        {
            var reconciles = await _db.PlatformReconcile
                .OrderByDescending(x => x.ReconcileDate)
                .ToListAsync();

            return _mapper.Map<List<PlatformReconcileDto>>(reconciles);
        }

        public async Task<PlatformReconcileDto> CreateAsync(CreatePlatformReconcileDto dto)
        {
            var reconcile = _mapper.Map<PlatformReconcile>(dto);
            reconcile.Status = ReconcileStatusEnum.Pending;
            reconcile.CreatedDate = DateTime.UtcNow;

            _db.PlatformReconcile.Add(reconcile);
            await _db.SaveChangesAsync();

            return _mapper.Map<PlatformReconcileDto>(reconcile);
        }

        public async Task<bool> ConfirmAsync(Guid id, Guid adminId)
        {
            var reconcile = await _db.PlatformReconcile.FindAsync(id);
            if (reconcile == null) return false;

            reconcile.Status = ReconcileStatusEnum.Matched;
            reconcile.ReconciledBy = adminId;
            reconcile.ReconciledAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
