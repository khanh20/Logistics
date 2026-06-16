using AutoMapper;
using LG.ApplicationBase.Localization;
using Microsoft.Extensions.Logging;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.Management;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class FinanceManagementService : CoreServiceBase, IFinanceManagementService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public FinanceManagementService(
            CoreDbContext db, 
            IMapper mapper, 
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<FinanceManagementService> logger) 
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<CreditLimitDto> GetCreditLimitByWalletAsync(Guid customerId)
        {
            var limit = await _db.CreditLimits.FirstOrDefaultAsync(x => x.CustomerId == customerId);
            return _mapper.Map<CreditLimitDto>(limit);
        }

        public async Task<CreditLimitDto> UpdateCreditLimitAsync(UpdateCreditLimitDto dto)
        {
            var limit = await _db.CreditLimits.FirstOrDefaultAsync(x => x.CustomerId == dto.CustomerId);
            if (limit == null)
            {
                limit = new CreditLimit { CustomerId = dto.CustomerId, GrantedAt = DateTime.UtcNow };
                _db.CreditLimits.Add(limit);
            }

            limit.MaxCreditVnd = dto.MaxCreditVnd;
            limit.DueDateDays = dto.DueDateDays;
            limit.IsActive = dto.IsActive;
            limit.ModifiedDate = DateTime.UtcNow;
            limit.ModifiedBy = GetCurrentUserId();

            await _db.SaveChangesAsync();
            return _mapper.Map<CreditLimitDto>(limit);
        }

        public async Task<List<DebtRecordDto>> GetDebtsByWalletAsync(Guid customerId)
        {
            var debts = await _db.DebtRecords
                .Where(x => x.CustomerId == customerId)
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
            return _mapper.Map<List<DebtRecordDto>>(debts);
        }

        public async Task<bool> PayDebtAsync(Guid debtId, decimal amount)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var debt = await _db.DebtRecords.FindAsync(debtId);
                if (debt == null || debt.IsPaid) return false;

                var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.CustomerId == debt.CustomerId);
                if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

                if (wallet.AvailableBalance < amount) throw new CoreException(CoreErrorCode.CoreInsufficientBalance);

                // Trừ tiền ví
                wallet.AvailableBalance -= amount;

                // Cập nhật DebtRecord
                debt.DebtAmountVnd -= amount;
                if (debt.DebtAmountVnd <= 0)
                {
                    debt.DebtAmountVnd = 0;
                    debt.IsPaid = true;
                    debt.PaidAt = DateTime.UtcNow;
                }
                debt.ModifiedDate = DateTime.UtcNow;
                debt.ModifiedBy = GetCurrentUserId();

                // Cập nhật CurrentDebt trong CreditLimit
                var limit = await _db.CreditLimits.FindAsync(debt.CreditLimitId);
                if (limit != null)
                {
                    limit.CurrentDebtVnd -= amount;
                    if (limit.CurrentDebtVnd < 0) limit.CurrentDebtVnd = 0;
                }

                // Lưu log giao dịch
                var transType = await _db.TransactionTypes.FirstOrDefaultAsync(t => t.Code == "DEBT_REPAYMENT");
                if (transType != null)
                {
                    _db.WalletTransactions.Add(new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = transType.Id,
                        Amount = amount,
                        BalanceBefore = wallet.AvailableBalance + amount,
                        BalanceAfter = wallet.AvailableBalance,
                        Note = $"Thanh toán nợ ID: {debt.Id}",
                        ReferenceType = "Debt",
                        ReferenceId = debt.Id
                    });
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
