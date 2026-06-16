using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAuditUserIdToGuid : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var tables = new[]
            {
                new { Table = "ZaloNotification", Columns = new[] { "CreatedBy" } },
                new { Table = "WithdrawRequest", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "WalletTransaction", Columns = new[] { "CreatedBy" } },
                new { Table = "Wallet", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "VipTier", Columns = new[] { "CreatedBy" } },
                new { Table = "TransactionType", Columns = new[] { "CreatedBy" } },
                new { Table = "TopupRequest", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "RefundProcess", Columns = new[] { "CreatedBy" } },
                new { Table = "PlatformReconcile", Columns = new[] { "CreatedBy" } },
                new { Table = "PaymentLock", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "FraudDetection", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "FeeRule", Columns = new[] { "CreatedBy" } },
                new { Table = "DebtRecord", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "CustomerProfile", Columns = new[] { "CreatedBy", "ModifiedBy", "DeletedBy" } },
                new { Table = "CustomerKYC", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "CustomerAddress", Columns = new[] { "CreatedBy", "ModifiedBy", "DeletedBy" } },
                new { Table = "CreditLimit", Columns = new[] { "CreatedBy", "ModifiedBy" } },
                new { Table = "BankWebhookLog", Columns = new[] { "CreatedBy" } },
                new { Table = "BankAccount", Columns = new[] { "CreatedBy" } },
                new { Table = "BalanceSnapshot", Columns = new[] { "CreatedBy" } }
            };

            foreach (var item in tables)
            {
                foreach (var col in item.Columns)
                {
                    // Chuyển đổi từ int sang uuid trong PostgreSQL yêu cầu dùng USING. 
                    // Vì dữ liệu int cũ không thể cast sang uuid nên ta dùng NULL để xóa dữ liệu cũ.
                    migrationBuilder.Sql($"ALTER TABLE finance.\"{item.Table}\" ALTER COLUMN \"{col}\" TYPE uuid USING NULL;");
                }
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "ZaloNotification",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "WithdrawRequest",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "WithdrawRequest",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "WalletTransaction",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "Wallet",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "Wallet",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "VipTier",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "TransactionType",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "TopupRequest",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "TopupRequest",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "RefundProcess",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "PlatformReconcile",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "PaymentLock",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "PaymentLock",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "FraudDetection",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "FraudDetection",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "FeeRule",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "DebtRecord",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "DebtRecord",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "CustomerProfile",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DeletedBy",
                schema: "finance",
                table: "CustomerProfile",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "CustomerProfile",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "CustomerKYC",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "CustomerKYC",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "CustomerAddress",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DeletedBy",
                schema: "finance",
                table: "CustomerAddress",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "CustomerAddress",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ModifiedBy",
                schema: "finance",
                table: "CreditLimit",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "CreditLimit",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "BankWebhookLog",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "BankAccount",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "CreatedBy",
                schema: "finance",
                table: "BalanceSnapshot",
                type: "integer",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
