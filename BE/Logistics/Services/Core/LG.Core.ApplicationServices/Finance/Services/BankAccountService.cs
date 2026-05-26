using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.BankAccount;
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

using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class BankAccountService : CoreServiceBase, IBankAccountService
    {
        private readonly CoreDbContext _db;

        public BankAccountService(
            CoreDbContext db, 
            IHttpContextAccessor httpContext, 
            LocalizationBase localization,
            IMapper mapper,
            ILogger<BankAccountService> logger) 
            : base(logger, httpContext, db, localization, mapper)
        {
            _db = db;
        }
        
        public async Task<BankAccountDto?> GetByIdAsync(Guid id)
        {
            var account = await _db.BankAccounts.FindAsync(id);
            return account == null ? null : _mapper.Map<BankAccountDto>(account);
        }

        public async Task<BankAccountDto> CreateAsync(CreateBankAccountDto dto, Guid? currentUserId, BankAccountType type)
        {
            // Kiểm tra STK có trống không
            if (string.IsNullOrWhiteSpace(dto.AccountNumber))
            {
                throw new CoreException(CoreErrorCode.CoreBankAccountInvalidNumberLength); // Hoặc mã lỗi phù hợp hơn nếu có
            }

            // Kiểm tra trùng số tài khoản trong hệ thống
            var isDuplicate = await _db.BankAccounts.AnyAsync(x => x.AccountNumber == dto.AccountNumber && x.IsActive);
            if (isDuplicate)
            {
                throw new CoreException(CoreErrorCode.CoreBankAccountDuplicateNumber);
            }

            var entity = new BankAccount
            {
                BankName = dto.BankName,
                BankCode = dto.BankCode,
                AccountNumber = dto.AccountNumber,
                AccountHolder = dto.AccountHolder,
                Branch = dto.Branch,
                WebhookService = dto.WebhookService,
                Type = type,
                UserId = type == BankAccountType.Customer ? currentUserId : null,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            await _db.BankAccounts.AddAsync(entity);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Đã tạo tài khoản ngân hàng thành công: {BankName} - {AccountNumber} - Type: {Type}", entity.BankName, entity.AccountNumber, entity.Type);

            return _mapper.Map<BankAccountDto>(entity);
        }

        public async Task<List<BankAccountDto>> GetSystemBankAccountsAsync(bool activeOnly = true)
        {
            var query = _db.BankAccounts
                .AsNoTracking()
                .Where(x => x.Type == BankAccountType.System);

            if (activeOnly)
            {
                query = query.Where(x => x.IsActive);
            }

            var accounts = await query
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<BankAccountDto>>(accounts);
        }

        public async Task<List<BankAccountDto>> GetCustomerBankAccountsAsync(Guid userId)
        {
            var accounts = await _db.BankAccounts
                .AsNoTracking()
                .Where(x => x.Type == BankAccountType.Customer && x.UserId == userId && x.IsActive)
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<BankAccountDto>>(accounts);
        }

        public async Task<bool> ToggleActiveStatusAsync(Guid id)
        {
            var account = await _db.BankAccounts.FindAsync(id);
            if (account == null) return false;

            account.IsActive = !account.IsActive;
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var account = await _db.BankAccounts.FindAsync(id);
            if (account == null) return false;

            _db.BankAccounts.Remove(account);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
