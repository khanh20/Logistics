using AutoMapper;
using LG.ApplicationBase.Localization;
using Microsoft.Extensions.Logging;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.Refund;
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
    public class RefundService : CoreServiceBase, IRefundService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public RefundService(
            CoreDbContext db, 
            IMapper mapper, 
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<RefundService> logger) 
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<RefundDto>> GetAllAsync()
        {
            var refunds = await _db.RefundProcesses
                .OrderByDescending(x => x.CreatedDate)
                .ToListAsync();
            return _mapper.Map<List<RefundDto>>(refunds);
        }

        public async Task<RefundDto> GetByIdAsync(Guid id)
        {
            var refund = await _db.RefundProcesses.FindAsync(id);
            return _mapper.Map<RefundDto>(refund);
        }

        public async Task<RefundDto> CreateRefundRequestAsync(CreateRefundDto dto)
        {
            var wallet = await _db.Wallets.FindAsync(dto.WalletId);
            if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

            var refund = _mapper.Map<RefundProcess>(dto);
            
            // Tính toán tiền phạt và thực nhận
            refund.PenaltyVnd = Math.Round(refund.GrossAmountVnd * (refund.PenaltyPct / 100), 0);
            refund.NetRefundVnd = refund.GrossAmountVnd - refund.PenaltyVnd;
            refund.Status = RefundStatusEnum.Pending;
            refund.TriggeredBy = GetCurrentUserId();

            _db.RefundProcesses.Add(refund);
            await _db.SaveChangesAsync();

            return _mapper.Map<RefundDto>(refund);
        }

        public async Task<bool> ApproveRefundAsync(Guid refundId)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var refund = await _db.RefundProcesses.FindAsync(refundId);
                    if (refund == null || refund.Status != RefundStatusEnum.Pending) return false;

                    var wallet = await _db.Wallets.FindAsync(refund.WalletId);
                    if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

                    // 1. Cập nhật số dư ví
                    wallet.AvailableBalance += refund.NetRefundVnd;

                    // 2. Tạo lịch sử giao dịch ví
                    var transactionType = await _db.TransactionTypes.FirstOrDefaultAsync(t => t.Code == "REFUND");
                    if (transactionType == null) throw new CoreException(CoreErrorCode.CoreTransactionTypeConfigMissing);

                    var walletTransaction = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = transactionType.Id,
                        Amount = refund.NetRefundVnd,
                        BalanceBefore = wallet.AvailableBalance - refund.NetRefundVnd,
                        BalanceAfter = wallet.AvailableBalance,
                        Note = $"Hoàn tiền cho {refund.ReferenceType} ID: {refund.ReferenceId}.",
                        ReferenceType = refund.ReferenceType,
                        ReferenceId = refund.ReferenceId
                    };

                    _db.WalletTransactions.Add(walletTransaction);
                    await _db.SaveChangesAsync(); // Save to get transaction ID

                    // 3. Cập nhật trạng thái Refund
                    refund.Status = RefundStatusEnum.Completed;
                    refund.RefundedAt = DateTime.UtcNow;
                    refund.WalletTransactionId = walletTransaction.Id;

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<bool> RejectRefundAsync(Guid refundId, string reason)
        {
            var refund = await _db.RefundProcesses.FindAsync(refundId);
            if (refund == null || refund.Status != RefundStatusEnum.Pending) return false;

            refund.Status = RefundStatusEnum.Failed;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
