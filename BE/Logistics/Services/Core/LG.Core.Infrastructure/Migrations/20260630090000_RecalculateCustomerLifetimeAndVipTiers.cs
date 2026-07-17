using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RecalculateCustomerLifetimeAndVipTiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Cập nhật lại cột LifetimeValueVnd cho toàn bộ profile dựa trên lịch sử WalletTransaction
            migrationBuilder.Sql(@"
                UPDATE finance.""CustomerProfile"" cp
                SET ""LifetimeValueVnd"" = COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN wt.""ReferenceType"" IN ('OrderDeposit', 'OrderFinalPayment') THEN wt.""Amount""
                            WHEN wt.""ReferenceType"" IN ('OrderCancelRefund', 'OrderDepositRefund', 'OrderFinalRefund') THEN -wt.""Amount""
                            ELSE 0
                        END
                    )
                    FROM finance.""WalletTransaction"" wt
                    JOIN finance.""Wallet"" w ON wt.""WalletId"" = w.""Id""
                    WHERE w.""CustomerId"" = cp.""UserId""
                ), 0);
            ");

            // 2. Cập nhật lại cột VipTierId cho các profile theo mốc chi tiêu mới
            migrationBuilder.Sql(@"
                UPDATE finance.""CustomerProfile"" cp
                SET ""VipTierId"" = (
                    SELECT vt.""Id""
                    FROM finance.""VipTier"" vt
                    WHERE vt.""MinSpendVnd"" <= cp.""LifetimeValueVnd""
                    ORDER BY vt.""MinSpendVnd"" DESC
                    LIMIT 1
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
