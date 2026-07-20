using LG.Core.Domain.Finance;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LG.Core.Infrastructure.Data.Configurations
{
    public class CustomerProfileConfig : IEntityTypeConfiguration<CustomerProfile>
    {
        public void Configure(EntityTypeBuilder<CustomerProfile> b)
        {
            b.HasIndex(x => x.UserId)
             .IsUnique();

            b.HasIndex(x => x.CustomerCode).IsUnique();
            b.HasIndex(x => x.ReferralCode).IsUnique();

            b.HasOne<VipTier>()
             .WithMany()
             .HasForeignKey(x => x.VipTierId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class CustomerKYCConfig : IEntityTypeConfiguration<CustomerKYC>
    {
        public void Configure(EntityTypeBuilder<CustomerKYC> b)
        {
            b.HasIndex(x => x.CustomerId).IsUnique();
            b.HasIndex(x => x.IdNumber).IsUnique();

            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class CustomerAddressConfig : IEntityTypeConfiguration<CustomerAddress>
    {
        public void Configure(EntityTypeBuilder<CustomerAddress> b)
        {
            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class WalletConfig : IEntityTypeConfiguration<Wallet>
    {
        public void Configure(EntityTypeBuilder<Wallet> b)
        {
            b.HasIndex(x => x.CustomerId).IsUnique();

            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class CreditLimitConfig : IEntityTypeConfiguration<CreditLimit>
    {
        public void Configure(EntityTypeBuilder<CreditLimit> b)
        {
            b.HasIndex(x => x.CustomerId).IsUnique();

            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class DebtRecordConfig : IEntityTypeConfiguration<DebtRecord>
    {
        public void Configure(EntityTypeBuilder<DebtRecord> b)
        {
            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);

            b.HasOne<CreditLimit>()
             .WithMany()
             .HasForeignKey(x => x.CreditLimitId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class PaymentLockConfig : IEntityTypeConfiguration<PaymentLock>
    {
        public void Configure(EntityTypeBuilder<PaymentLock> b)
        {
            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class WalletTransactionConfig : IEntityTypeConfiguration<WalletTransaction>
    {
        public void Configure(EntityTypeBuilder<WalletTransaction> b)
        {
            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);

            b.HasOne<TransactionType>()
             .WithMany()
             .HasForeignKey(x => x.TypeId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class TopupRequestConfig : IEntityTypeConfiguration<TopupRequest>
    {
        public void Configure(EntityTypeBuilder<TopupRequest> b)
        {
            b.HasIndex(x => x.TransferContent).IsUnique();

            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);

            b.HasOne<BankAccount>()
             .WithMany()
             .HasForeignKey(x => x.BankAccountId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class WithdrawRequestConfig : IEntityTypeConfiguration<WithdrawRequest>
    {
        public void Configure(EntityTypeBuilder<WithdrawRequest> b)
        {
            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);

            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class RefundProcessConfig : IEntityTypeConfiguration<RefundProcess>
    {
        public void Configure(EntityTypeBuilder<RefundProcess> b)
        {
            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class FraudDetectionConfig : IEntityTypeConfiguration<FraudDetection>
    {
        public void Configure(EntityTypeBuilder<FraudDetection> b)
        {
            b.HasOne<Wallet>()
             .WithMany()
             .HasForeignKey(x => x.WalletId)
             .OnDelete(DeleteBehavior.Restrict);

            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class BankWebhookLogConfig : IEntityTypeConfiguration<BankWebhookLog>
    {
        public void Configure(EntityTypeBuilder<BankWebhookLog> b)
        {
            b.HasIndex(x => x.IdempotencyKey).IsUnique();

            b.HasOne<TopupRequest>()
             .WithMany()
             .HasForeignKey(x => x.MatchedTopupId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);

            b.HasOne<BankAccount>()
             .WithMany()
             .HasForeignKey(x => x.BankAccountId)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class FeeRuleConfig : IEntityTypeConfiguration<FeeRule>
    {
        public void Configure(EntityTypeBuilder<FeeRule> b)
        {
            b.HasOne<VipTier>()
             .WithMany()
             .HasForeignKey(x => x.VipTierId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class EmailNotificationConfig : IEntityTypeConfiguration<EmailNotification>
    {
        public void Configure(EntityTypeBuilder<EmailNotification> b)
        {
            b.HasOne<CustomerProfile>()
             .WithMany()
             .HasForeignKey(x => x.CustomerId)
             .HasPrincipalKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class TransactionTypeConfig : IEntityTypeConfiguration<TransactionType>
    {
        public void Configure(EntityTypeBuilder<TransactionType> b)
        {
            b.HasIndex(x => x.Code).IsUnique();
        }
    }

    public class VipTierConfig : IEntityTypeConfiguration<VipTier>
    {
        public void Configure(EntityTypeBuilder<VipTier> b)
        {
            b.HasIndex(x => x.Name).IsUnique();
            b.HasIndex(x => x.Level).IsUnique();
        }
    }

    public class DailyRevenueReportConfig : IEntityTypeConfiguration<DailyRevenueReport>
    {
        public void Configure(EntityTypeBuilder<DailyRevenueReport> b)
        {
            b.HasIndex(x => x.ReportDate).IsUnique();
        }
    }

    public class BalanceSnapshotConfig : IEntityTypeConfiguration<BalanceSnapshot>
    {
        public void Configure(EntityTypeBuilder<BalanceSnapshot> b)
        {
            b.HasIndex(x => x.SnapshotDate).IsUnique();
        }
    }
}
