using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Common.Interfaces;
using LG.Core.ApplicationServices.Finance.DTOs.EmailNotification;
using LG.Core.ApplicationServices.Finance.DTOs.Transaction;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Domain.Finance;
using LG.Core.Infrastructure;
using LG.Untils.EnumFinance;
using LG.Shared.Constants.ErrorCodes;
using LG.Core.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;

using AutoMapper;
using LG.ApplicationBase.Localization;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class TransactionService : CoreServiceBase, ITransactionService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;
        private readonly IEmailNotificationService _emailNotificationService;
       
        public TransactionService(
            CoreDbContext db, 
            IHttpContextAccessor httpContext, 
            IEmailNotificationService emailNotificationService,
            LocalizationBase localization,
            IMapper mapper,
            ILogger<TransactionService> logger) 
            : base(logger, httpContext, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
            _emailNotificationService = emailNotificationService;
        }

        private static readonly SemaphoreSlim _walletLock = new SemaphoreSlim(1, 1);

        private async Task<Wallet> GetOrCreateWalletAsync(Guid userId)
        {
            await _walletLock.WaitAsync();
            try
            {
                var wallets = await _db.Wallets
                    .Where(w => w.CustomerId == userId && w.Currency == "VND")
                    .OrderBy(w => w.CreatedDate)
                    .ToListAsync();

                if (wallets.Count == 0)
                {
                    var wallet = new Wallet
                    {
                        CustomerId = userId,
                        Currency = "VND",
                        AvailableBalance = 0,
                        FrozenBalance = 0,
                        CreatedDate = DateTime.UtcNow
                    };
                    await _db.Wallets.AddAsync(wallet);
                    await _db.SaveChangesAsync();
                    return wallet;
                }

                var mainWallet = wallets.First();

                if (wallets.Count > 1)
                {
                    for (int i = 1; i < wallets.Count; i++)
                    {
                        mainWallet.AvailableBalance += wallets[i].AvailableBalance;
                        mainWallet.FrozenBalance += wallets[i].FrozenBalance;
                        mainWallet.TotalDepositedEver += wallets[i].TotalDepositedEver;

                        var topups = await _db.TopupRequests.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        topups.ForEach(t => t.WalletId = mainWallet.Id);

                        var withdraws = await _db.WithdrawRequests.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        withdraws.ForEach(t => t.WalletId = mainWallet.Id);

                        var txs = await _db.WalletTransactions.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        txs.ForEach(t => t.WalletId = mainWallet.Id);

                        var refunds = await _db.RefundProcesses.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        refunds.ForEach(t => t.WalletId = mainWallet.Id);

                        var locks = await _db.PaymentLocks.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        locks.ForEach(t => t.WalletId = mainWallet.Id);

                        var frauds = await _db.FraudDetections.Where(t => t.WalletId == wallets[i].Id).ToListAsync();
                        frauds.ForEach(t => t.WalletId = mainWallet.Id);

                        _db.Wallets.Remove(wallets[i]);
                    }
                    await _db.SaveChangesAsync();
                }

                return mainWallet;
            }
            finally
            {
                _walletLock.Release();
            }
        }

        public async Task<TopupResponseDto> CreateTopupRequestAsync(CreateTopupDto dto, Guid currentUserId)
        {
            var wallet = await GetOrCreateWalletAsync(currentUserId);

            // Kiểm tra BankAccount có phải của hệ thống không
            var bankAccount = await _db.BankAccounts.FirstOrDefaultAsync(b => b.Id == dto.BankAccountId && b.Type == BankAccountType.System && b.IsActive);
            if (bankAccount == null)
                throw new CoreException(CoreErrorCode.CoreTransactionBankNotFoundOrInactive);

            // Sinh mã chuyển khoản ngẫu nhiên: NAP + 6 số
            var random = new Random();
            string transferContent = $"NAP{random.Next(100000, 999999)}";

            var topup = new TopupRequest
            {
                WalletId = wallet.Id,
                BankAccountId = dto.BankAccountId,
                AmountVnd = dto.Amount,
                TransferContent = transferContent,
                Status = TopupStatusEnum.Pending,
                ExpiresAt = DateTime.UtcNow.AddHours(24), // Hết hạn sau 24h
                CreatedDate = DateTime.UtcNow
            };

            await _db.TopupRequests.AddAsync(topup);
            await _db.SaveChangesAsync();

            return _mapper.Map<TopupResponseDto>(topup);
        }

        public async Task<List<TopupResponseDto>> GetMyTopupsAsync(Guid currentUserId)
        {
            var wallet = await GetOrCreateWalletAsync(currentUserId);
            var list = await _db.TopupRequests
                .Where(t => t.WalletId == wallet.Id)
                .OrderByDescending(t => t.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<TopupResponseDto>>(list);
        }

        public async Task<WalletDto> GetMyWalletAsync(Guid currentUserId)
        {
            var wallet = await GetOrCreateWalletAsync(currentUserId);
            return _mapper.Map<WalletDto>(wallet);
        }

        public async Task<WithdrawResponseDto> CreateWithdrawRequestAsync(CreateWithdrawDto dto, Guid currentUserId)
        {
            // Bắt đầu Transaction để tránh lỗi đồng bộ (Race Condition) khi trừ tiền
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var wallet = await GetOrCreateWalletAsync(currentUserId);

                    if (wallet.IsFrozen)
                        throw new CoreException(CoreErrorCode.CoreWalletFrozen);

                    if (wallet.AvailableBalance < dto.Amount)
                        throw new CoreException(CoreErrorCode.CoreInsufficientBalance);

                    // Kiểm tra STK nhận tiền có phải của chính User này không
                    var bankAccount = await _db.BankAccounts.FirstOrDefaultAsync(b => b.Id == dto.BankAccountId && b.UserId == currentUserId && b.Type == BankAccountType.Customer && b.IsActive);
                    if (bankAccount == null)
                        throw new CoreException(CoreErrorCode.CoreInvalidReceiveBankAccount);

                    // Logic ĐÓNG BĂNG SỐ DƯ
                    wallet.AvailableBalance -= dto.Amount;
                    wallet.FrozenBalance += dto.Amount;

                    var withdraw = new WithdrawRequest
                    {
                        WalletId = wallet.Id,
                        CustomerId = currentUserId,
                        BankName = bankAccount.BankName,
                        BankAccountNo = bankAccount.AccountNumber,
                        AccountHolder = bankAccount.AccountHolder,
                        AmountVnd = dto.Amount,
                        FeeVnd = 0, // Mặc định miễn phí
                        NetAmountVnd = dto.Amount,
                        Status = WithdrawStatusEnum.Pending,
                        CreatedDate = DateTime.UtcNow
                    };

                    await _db.WithdrawRequests.AddAsync(withdraw);
                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return _mapper.Map<WithdrawResponseDto>(withdraw);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<List<WithdrawResponseDto>> GetMyWithdrawsAsync(Guid currentUserId)
        {
            var wallet = await GetOrCreateWalletAsync(currentUserId);
            var list = await _db.WithdrawRequests
                .Where(w => w.WalletId == wallet.Id)
                .OrderByDescending(w => w.CreatedDate)
                .ToListAsync();

            return _mapper.Map<List<WithdrawResponseDto>>(list);
        }

        public async Task<List<WithdrawResponseDto>> GetPendingWithdrawsAsync()
        {
            var list = await _db.WithdrawRequests
                .Where(w => w.Status == WithdrawStatusEnum.Pending)
                .OrderBy(w => w.CreatedDate) // Xếp cũ nhất lên đầu để duyệt trước
                .ToListAsync();

            return _mapper.Map<List<WithdrawResponseDto>>(list);
        }

        public async Task<bool> ApproveWithdrawAsync(Guid withdrawId, Guid adminId, string? transferRef)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var withdraw = await _db.WithdrawRequests.FindAsync(withdrawId);
                    if (withdraw == null || withdraw.Status != WithdrawStatusEnum.Pending)
                        throw new CoreException(CoreErrorCode.CoreWithdrawRequestNotFoundOrProcessed);

                    var wallet = await _db.Wallets.FindAsync(withdraw.WalletId);
                    if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

                    // 1. Trừ hẳn tiền từ FrozenBalance
                    wallet.FrozenBalance -= withdraw.AmountVnd;
                    wallet.TotalSpentEver += withdraw.AmountVnd;

                    // 2. Tạo Lịch sử giao dịch ví (WalletTransaction)
                    var transactionType = await _db.TransactionTypes.FirstOrDefaultAsync(t => t.Code == "WITHDRAW" || t.Code == "PAYMENT");
                    var typeId = transactionType?.Id ?? Guid.Empty;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = typeId,
                        Amount = withdraw.AmountVnd,
                        BalanceBefore = wallet.AvailableBalance + withdraw.AmountVnd, // Dùng số dư cộng với khoản đang đóng băng để hiển thị logic khấu trừ trên UI
                        BalanceAfter = wallet.AvailableBalance,
                        ReferenceType = "Withdraw",
                        ReferenceId = withdraw.Id,
                        Note = "Rút tiền về tài khoản ngân hàng",
                        CreatedDate = DateTime.UtcNow
                    };
                    await _db.WalletTransactions.AddAsync(walletTx);

                    // 3. Cập nhật trạng thái
                    withdraw.Status = WithdrawStatusEnum.Approved; // Hoặc Completed tuỳ quy trình
                    withdraw.ApprovedBy = adminId;
                    withdraw.TransferRef = transferRef;
                    withdraw.ProcessedAt = DateTime.UtcNow;
                    withdraw.WalletTransactionId = walletTx.Id;

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Gửi email thông báo rút tiền thành công
                    await SendWithdrawEmailAsync(withdraw.CustomerId, withdraw.AmountVnd, wallet.AvailableBalance, true);

                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<bool> RejectWithdrawAsync(Guid withdrawId, Guid adminId, string reason)
        {
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _db.Database.BeginTransactionAsync();
                try
                {
                    var withdraw = await _db.WithdrawRequests.FindAsync(withdrawId);
                    if (withdraw == null || withdraw.Status != WithdrawStatusEnum.Pending)
                        throw new CoreException(CoreErrorCode.CoreWithdrawRequestNotFoundOrProcessed);

                    var wallet = await _db.Wallets.FindAsync(withdraw.WalletId);
                    if (wallet == null) throw new CoreException(CoreErrorCode.CoreWalletNotFound);

                    // 1. Trả lại tiền từ FrozenBalance về AvailableBalance
                    wallet.FrozenBalance -= withdraw.AmountVnd;
                    wallet.AvailableBalance += withdraw.AmountVnd;

                    // 2. Tạo Lịch sử giao dịch ví (WalletTransaction) để user biết tiền đã được hoàn
                    var transactionType = await _db.TransactionTypes.FirstOrDefaultAsync(t => t.Code == "REFUND" || t.Code == "SYSTEM");
                    var typeId = transactionType?.Id ?? Guid.Empty;

                    var walletTx = new WalletTransaction
                    {
                        WalletId = wallet.Id,
                        TypeId = typeId,
                        Amount = withdraw.AmountVnd,
                        BalanceBefore = wallet.AvailableBalance - withdraw.AmountVnd, // Số dư trước khi hoàn
                        BalanceAfter = wallet.AvailableBalance, // Số dư sau khi hoàn
                        ReferenceType = "WithdrawRejected",
                        ReferenceId = withdraw.Id,
                        Note = $"Hoàn tiền do từ chối yêu cầu rút tiền ({reason})",
                        CreatedDate = DateTime.UtcNow
                    };
                    await _db.WalletTransactions.AddAsync(walletTx);

                    // 3. Cập nhật trạng thái
                    withdraw.Status = WithdrawStatusEnum.Rejected;
                    withdraw.ApprovedBy = adminId;
                    withdraw.RejectedReason = reason;
                    withdraw.ProcessedAt = DateTime.UtcNow;
                    withdraw.WalletTransactionId = walletTx.Id;

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Gửi email thông báo rút tiền bị từ chối
                    await SendWithdrawEmailAsync(withdraw.CustomerId, withdraw.AmountVnd, wallet.AvailableBalance, false, reason);

                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        private async Task SendWithdrawEmailAsync(Guid customerId, decimal amount, decimal currentBalance, bool isApproved, string? rejectReason = null)
        {
            try
            {
                var email = await GetUserEmailAsync(customerId);
                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("Không thể gửi email rút tiền: Không tìm thấy email cho CustomerId={CustomerId}", customerId);
                    return;
                }

                var templateData = isApproved
                    ? $"Yêu cầu rút {amount:N0} VNĐ của bạn đã được duyệt thành công. Tiền sẽ sớm được chuyển về tài khoản ngân hàng của bạn. Số dư khả dụng hiện tại: {currentBalance:N0} VNĐ."
                    : $"Yêu cầu rút {amount:N0} VNĐ của bạn đã bị từ chối. Lý do: {rejectReason}. Số tiền đã được hoàn lại vào ví của bạn. Số dư khả dụng hiện tại: {currentBalance:N0} VNĐ.";

                var dto = new SendEmailNotificationDto
                {
                    CustomerId = customerId,
                    ToEmail = email,
                    Subject = isApproved ? "Rút tiền thành công - Logistics System" : "Rút tiền thất bại - Logistics System",
                    TemplateType = isApproved ? EmailTemplateTypeEnum.WithdrawSuccess : EmailTemplateTypeEnum.WithdrawSuccess, // Hoặc thêm enum Reject
                    TemplateData = templateData
                };

                await _emailNotificationService.CreateAsync(dto);

                // Bắn thông báo Web
                await CreateWebNotificationAsync(
                    userId: customerId,
                    title: isApproved ? "Rút tiền thành công" : "Rút tiền bị từ chối",
                    content: templateData,
                    type: "Payment",
                    referenceType: "WithdrawRequest",
                    referenceId: null // Nếu muốn có thể truyền withdrawId vào tham số của hàm này
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi EmailNotificationService.CreateAsync hoặc CreateWebNotificationAsync cho Withdraw");
            }
        }
    }
}
