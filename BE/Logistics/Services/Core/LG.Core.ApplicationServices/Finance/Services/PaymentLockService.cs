using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.PaymentLock;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Exceptions;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Shared.Constants.ErrorCodes;
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
    public class PaymentLockService : CoreServiceBase, IPaymentLockService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public PaymentLockService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<PaymentLockService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<PaymentLockDto>> GetByOrderIdAsync(Guid orderId)
        {
            var locks = await _db.PaymentLocks
                .Where(x => x.OrderId == orderId)
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<PaymentLockDto>>(locks);
        }

        public async Task<PaymentLockDto> CreateAsync(CreatePaymentLockDto dto)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var wallet = await _db.Wallets.FindAsync(dto.WalletId);
                if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

                if (wallet.AvailableBalance < dto.LockedAmountVnd)
                    throw new CoreException(CoreErrorCode.CoreInsufficientBalance);

                // Update wallet balances
                wallet.AvailableBalance -= dto.LockedAmountVnd;
                wallet.FrozenBalance += dto.LockedAmountVnd;
                wallet.ModifiedDate = DateTime.UtcNow;

                var paymentLock = _mapper.Map<PaymentLock>(dto);
                paymentLock.Status = PaymentLockStatusEnum.Active;
                paymentLock.CreatedDate = DateTime.UtcNow;

                _db.PaymentLocks.Add(paymentLock);
                await _db.SaveChangesAsync();

                await transaction.CommitAsync();

                return _mapper.Map<PaymentLockDto>(paymentLock);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ReleaseAsync(Guid id, ReleaseReasonEnum reason)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var paymentLock = await _db.PaymentLocks.FindAsync(id);
                if (paymentLock == null || paymentLock.Status != PaymentLockStatusEnum.Active)
                    return false;

                var wallet = await _db.Wallets.FindAsync(paymentLock.WalletId);
                if (wallet == null) return false;

                // Release locked amount
                wallet.FrozenBalance -= paymentLock.LockedAmountVnd;
                
                // If the order was cancelled, we refund the money to available balance.
                // If it was completed, the money is considered spent.
                // Depending on the reason, we might move it back to AvailableBalance or not.
                if (reason != ReleaseReasonEnum.OrderCompleted) 
                {
                    wallet.AvailableBalance += paymentLock.LockedAmountVnd;
                }
                else
                {
                    wallet.TotalSpentEver += paymentLock.LockedAmountVnd;
                }
                
                wallet.ModifiedDate = DateTime.UtcNow;

                paymentLock.Status = PaymentLockStatusEnum.Released;
                paymentLock.ReleasedAt = DateTime.UtcNow;
                paymentLock.ReleaseReason = reason;
                paymentLock.ModifiedDate = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
    }
}
