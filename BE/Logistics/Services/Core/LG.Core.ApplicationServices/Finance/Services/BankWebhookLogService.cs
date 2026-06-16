using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.BankWebhookLog;
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

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class BankWebhookLogService : CoreServiceBase, IBankWebhookLogService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public BankWebhookLogService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<BankWebhookLogService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<BankWebhookLogDto>> GetAllAsync()
        {
            var logs = await _db.BankWebhookLogs
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<BankWebhookLogDto>>(logs);
        }

        public async Task<BankWebhookLogDto?> GetByIdAsync(Guid id)
        {
            var log = await _db.BankWebhookLogs.FindAsync(id);
            return log == null ? null : _mapper.Map<BankWebhookLogDto>(log);
        }
    }
}
