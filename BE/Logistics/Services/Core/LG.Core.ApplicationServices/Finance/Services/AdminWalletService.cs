using AutoMapper;
using LG.ApplicationBase.Localization;
using LG.Core.ApplicationServices.Common;
using LG.Core.ApplicationServices.Finance.DTOs.Wallet;
using LG.Core.ApplicationServices.Finance.Interfaces;
using LG.Core.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using LG.Untils.EnumFinance;

namespace LG.Core.ApplicationServices.Finance.Services
{
    public class AdminWalletService : CoreServiceBase, IAdminWalletService
    {
        private readonly CoreDbContext _db;
        private readonly IMapper _mapper;

        public AdminWalletService(
            CoreDbContext db,
            IMapper mapper,
            IHttpContextAccessor httpContextAccessor,
            LocalizationBase localization,
            ILogger<AdminWalletService> logger)
            : base(logger, httpContextAccessor, db, localization, mapper)
        {
            _db = db;
            _mapper = mapper;
        }

        public async Task<List<FrozenWalletDto>> GetFrozenWalletsAsync()
        {
            var frozenWallets = await _db.Wallets
                .Select(w => new
                {
                    Wallet = w,
                    Customer = _db.CustomerProfiles.FirstOrDefault(c => c.UserId == w.CustomerId),
                    LatestFraud = _db.FraudDetections
                        .Where(f => f.WalletId == w.Id)
                        .OrderByDescending(f => f.CreatedDate)
                        .FirstOrDefault()
                })
                .ToListAsync();

            var result = new List<FrozenWalletDto>();
            foreach (var item in frozenWallets)
            {
                result.Add(new FrozenWalletDto
                {
                    WalletId = item.Wallet.Id,
                    CustomerId = item.Wallet.CustomerId,
                    CustomerName = item.Customer?.FullName ?? "Unknown",
                    AvailableBalance = item.Wallet.AvailableBalance,
                    FrozenBalance = item.Wallet.FrozenBalance,
                    RiskScore = item.LatestFraud?.RiskScore ?? 0,
                    IsFrozen = item.Wallet.IsFrozen,
                    IgnoreFraudDetection = item.Wallet.IgnoreFraudDetection,
                    Reason = item.LatestFraud?.EvidenceJson ?? "Không xác định",
                    FrozenDate = item.LatestFraud?.CreatedDate ?? item.Wallet.ModifiedDate ?? DateTime.UtcNow
                });
            }

            return result.OrderByDescending(x => x.FrozenDate).ToList();
        }

        public async Task<bool> UnlockWalletAsync(Guid walletId, Guid adminId, string reason)
        {
            var wallet = await _db.Wallets.FindAsync(walletId);
            if (wallet == null || !wallet.IsFrozen) return false;

            wallet.IsFrozen = false;
            wallet.ModifiedDate = DateTime.UtcNow;
            
            // Đánh dấu Fraud record gần nhất là đã Resolved
            var latestFraud = await _db.FraudDetections
                .Where(f => f.WalletId == walletId && f.Status == FraudStatusEnum.Open)
                .OrderByDescending(f => f.CreatedDate)
                .FirstOrDefaultAsync();

            if (latestFraud != null)
            {
                latestFraud.Status = FraudStatusEnum.Resolved;
                latestFraud.ResolutionNote = $"Đã mở khóa ví: {reason}";
                latestFraud.ReviewedBy = adminId;
                latestFraud.ReviewedAt = DateTime.UtcNow;
                latestFraud.ModifiedDate = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            
            _logger.LogInformation("Admin {AdminId} unlocked wallet {WalletId} with reason: {Reason}", adminId, walletId, reason);
            
            return true;
        }

        public async Task<bool> ToggleTrustAsync(Guid walletId, Guid adminId)
        {
            var wallet = await _db.Wallets.FindAsync(walletId);
            if (wallet == null) return false;

            wallet.IgnoreFraudDetection = !wallet.IgnoreFraudDetection;
            wallet.ModifiedDate = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin {AdminId} toggled IgnoreFraudDetection for wallet {WalletId} to {Status}", 
                adminId, walletId, wallet.IgnoreFraudDetection);

            return true;
        }
    }
}
