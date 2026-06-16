using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.TransactionType;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Exceptions;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Shared.Constants.ErrorCodes;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class TransactionTypeService : CoreServiceBase, ITransactionTypeService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public TransactionTypeService(
            CoreDbContext db,
            IHttpContextAccessor httpContext,
            LocalizationBase localization,
            IMapper mapper,
            ILogger<TransactionTypeService> logger)
            : base(logger, httpContext, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<TransactionTypeDto>> GetAllAsync()
        {
            var types = await _db.TransactionTypes.ToListAsync();
            return _mapper.Map<List<TransactionTypeDto>>(types);
        }

        public async Task<TransactionTypeDto?> GetByIdAsync(Guid id)
        {
            var type = await _db.TransactionTypes.FindAsync(id);
            return type == null ? null : _mapper.Map<TransactionTypeDto>(type);
        }

        public async Task<TransactionTypeDto> CreateAsync(CreateTransactionTypeDto dto)
        {
            // Kiểm tra trùng mã Code
            if (await _db.TransactionTypes.AnyAsync(t => t.Code == dto.Code))
            {
                throw new CoreException(CoreErrorCode.CoreTransactionTypeCodeExists);
            }

            var type = _mapper.Map<TransactionType>(dto);
            type.CreatedDate = DateTime.UtcNow;

            await _db.TransactionTypes.AddAsync(type);
            await _db.SaveChangesAsync();

            return _mapper.Map<TransactionTypeDto>(type);
        }

        public async Task<bool> UpdateAsync(UpdateTransactionTypeDto dto)
        {
            var type = await _db.TransactionTypes.FindAsync(dto.Id);
            if (type == null)
                return false;

            // Kiểm tra trùng mã Code (khác ID hiện tại)
            if (await _db.TransactionTypes.AnyAsync(t => t.Code == dto.Code && t.Id != dto.Id))
            {
                throw new CoreException(CoreErrorCode.CoreTransactionTypeCodeExists);
            }

            _mapper.Map(dto, type);

            _db.TransactionTypes.Update(type);
            await _db.SaveChangesAsync();

            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var type = await _db.TransactionTypes.FindAsync(id);
            if (type == null)
                return false;

            // Kiểm tra xem loại giao dịch này đã được sử dụng trong WalletTransaction chưa
            var isUsed = await _db.WalletTransactions.AnyAsync(w => w.TypeId == id);
            if (isUsed)
            {
                throw new CoreException(CoreErrorCode.CoreTransactionTypeUsedInTransactions);
            }

            _db.TransactionTypes.Remove(type);
            await _db.SaveChangesAsync();

            return true;
        }
    }
}
