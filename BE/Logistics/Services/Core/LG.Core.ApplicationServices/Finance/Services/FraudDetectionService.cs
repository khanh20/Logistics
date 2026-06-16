using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.FraudDetection;
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
    public class FraudDetectionService : CoreServiceBase, IFraudDetectionService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public FraudDetectionService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<FraudDetectionService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<FraudDetectionDto>> GetAllAsync()
        {
            var detections = await _db.FraudDetections
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<FraudDetectionDto>>(detections);
        }

        public async Task<FraudDetectionDto?> GetByIdAsync(Guid id)
        {
            var detection = await _db.FraudDetections.FindAsync(id);
            return detection == null ? null : _mapper.Map<FraudDetectionDto>(detection);
        }

        public async Task<bool> ReviewAsync(Guid id, ReviewFraudDto dto, Guid adminId)
        {
            var detection = await _db.FraudDetections.FindAsync(id);
            if (detection == null) return false;

            detection.Status = dto.Status;
            detection.ResolutionNote = dto.ResolutionNote;
            detection.ReviewedBy = adminId;
            detection.ReviewedAt = DateTime.UtcNow;
            detection.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
