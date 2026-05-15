using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.WalletTransaction;
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
    public class WalletTransactionService : CoreServiceBase, IWalletTransactionService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public WalletTransactionService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<WalletTransactionService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<WalletTransactionDto>> GetByWalletAsync(Guid walletId)
        {
            var transactions = await _db.WalletTransactions
                .Where(x => x.WalletId == walletId)
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            var dtos = _mapper.Map<List<WalletTransactionDto>>(transactions);

            // Populate TypeName
            foreach(var dto in dtos)
            {
                var type = await _db.TransactionTypes.FindAsync(dto.TypeId);
                dto.TypeName = type?.Name;
            }

            return dtos;
        }

        public async Task<List<WalletTransactionDto>> GetAllAsync()
        {
            var transactions = await _db.WalletTransactions
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            var dtos = _mapper.Map<List<WalletTransactionDto>>(transactions);

            foreach(var dto in dtos)
            {
                var type = await _db.TransactionTypes.FindAsync(dto.TypeId);
                dto.TypeName = type?.Name;
            }

            return dtos;
        }
    }
}
