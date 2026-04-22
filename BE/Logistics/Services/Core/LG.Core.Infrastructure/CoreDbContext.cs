using LG.Core.Domain.finance;
using LG.Core.Domain.Finance;
using LG.InfrastructureBase;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LG.Core.Infrastructure
{
    public class CoreDbContext : ApplicationDbContext
    {
        #region finance
        public DbSet<CustomerProfile> CustomerProfiles { get; set; }
        public DbSet<CustomerKYC> CustomerKycs { get; set; }
        public DbSet<CustomerAddress> CustomerAddresses { get; set; }
        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<TransactionType> TransactionTypes { get; set; }
        public DbSet<WalletTransaction> WalletTransactions { get; set; }
        public DbSet<VipTier> VipTiers { get; set; }
        public DbSet<RefundProcess> RefundProcesses { get; set; }
        public DbSet<ZaloNotification> ZaloNotifications { get; set; }
        public DbSet<WithdrawRequest> WithdrawRequests { get; set; }
        public DbSet<TopupRequest> TopupRequests { get; set; }
        public DbSet<PlatformReconcile> PlatformReconcile { get; set; }
        public DbSet<FraudDetection> FraudDetections { get; set; }
        public DbSet<FeeRule> FeeRules { get; set; }
        public DbSet<DailyRevenueReport> DailyRevenueReports { get; set; }
        public DbSet<BankAccount> BankAccounts { get; set; }
        public DbSet<BankWebhookLog> BankWebhookLogs { get; set; }
        public DbSet<CreditLimit> CreditLimits { get; set; }
        public DbSet<DebtRecord> DebtRecords { get; set; }
        public DbSet<PaymentLock> PaymentLocks { get; set; }
        public DbSet<BalanceSnapshot> BalanceSnapshots { get; set; }
        
        #endregion
        public CoreDbContext(
         DbContextOptions<CoreDbContext> options,
         IHttpContextAccessor httpContextAccessor
     )
         : base(options, httpContextAccessor) { }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            base.OnModelCreating(modelBuilder);
        }
    }
}
