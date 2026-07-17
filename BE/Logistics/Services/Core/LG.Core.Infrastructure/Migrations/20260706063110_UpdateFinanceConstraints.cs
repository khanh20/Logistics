using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateFinanceConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Wallet_CustomerId",
                schema: "finance",
                table: "Wallet");

            migrationBuilder.DropIndex(
                name: "IX_CustomerKYC_CustomerId",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropIndex(
                name: "IX_CreditLimit_CustomerId",
                schema: "finance",
                table: "CreditLimit");

            migrationBuilder.AddColumn<DateTime>(
                name: "LastOrderAt",
                schema: "finance",
                table: "CustomerProfile",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("DELETE FROM finance.\"BankWebhookLog\";");

            migrationBuilder.DropColumn(
                name: "BankAccountId",
                schema: "finance",
                table: "BankWebhookLog");

            migrationBuilder.AddColumn<Guid>(
                name: "BankAccountId",
                schema: "finance",
                table: "BankWebhookLog",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Wallet_CustomerId",
                schema: "finance",
                table: "Wallet",
                column: "CustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VipTier_Level",
                schema: "finance",
                table: "VipTier",
                column: "Level",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VipTier_Name",
                schema: "finance",
                table: "VipTier",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TransactionType_Code",
                schema: "finance",
                table: "TransactionType",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TopupRequest_TransferContent",
                schema: "finance",
                table: "TopupRequest",
                column: "TransferContent",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyRevenueReport_ReportDate",
                schema: "finance",
                table: "DailyRevenueReport",
                column: "ReportDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerProfile_CustomerCode",
                schema: "finance",
                table: "CustomerProfile",
                column: "CustomerCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerProfile_ReferralCode",
                schema: "finance",
                table: "CustomerProfile",
                column: "ReferralCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerKYC_CustomerId",
                schema: "finance",
                table: "CustomerKYC",
                column: "CustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerKYC_IdNumber",
                schema: "finance",
                table: "CustomerKYC",
                column: "IdNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CreditLimit_CustomerId",
                schema: "finance",
                table: "CreditLimit",
                column: "CustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankWebhookLog_BankAccountId",
                schema: "finance",
                table: "BankWebhookLog",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_BankWebhookLog_IdempotencyKey",
                schema: "finance",
                table: "BankWebhookLog",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BalanceSnapshot_SnapshotDate",
                schema: "finance",
                table: "BalanceSnapshot",
                column: "SnapshotDate",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BankWebhookLog_BankAccount_BankAccountId",
                schema: "finance",
                table: "BankWebhookLog",
                column: "BankAccountId",
                principalSchema: "finance",
                principalTable: "BankAccount",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BankWebhookLog_BankAccount_BankAccountId",
                schema: "finance",
                table: "BankWebhookLog");

            migrationBuilder.DropIndex(
                name: "IX_Wallet_CustomerId",
                schema: "finance",
                table: "Wallet");

            migrationBuilder.DropIndex(
                name: "IX_VipTier_Level",
                schema: "finance",
                table: "VipTier");

            migrationBuilder.DropIndex(
                name: "IX_VipTier_Name",
                schema: "finance",
                table: "VipTier");

            migrationBuilder.DropIndex(
                name: "IX_TransactionType_Code",
                schema: "finance",
                table: "TransactionType");

            migrationBuilder.DropIndex(
                name: "IX_TopupRequest_TransferContent",
                schema: "finance",
                table: "TopupRequest");

            migrationBuilder.DropIndex(
                name: "IX_DailyRevenueReport_ReportDate",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropIndex(
                name: "IX_CustomerProfile_CustomerCode",
                schema: "finance",
                table: "CustomerProfile");

            migrationBuilder.DropIndex(
                name: "IX_CustomerProfile_ReferralCode",
                schema: "finance",
                table: "CustomerProfile");

            migrationBuilder.DropIndex(
                name: "IX_CustomerKYC_CustomerId",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropIndex(
                name: "IX_CustomerKYC_IdNumber",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropIndex(
                name: "IX_CreditLimit_CustomerId",
                schema: "finance",
                table: "CreditLimit");

            migrationBuilder.DropIndex(
                name: "IX_BankWebhookLog_BankAccountId",
                schema: "finance",
                table: "BankWebhookLog");

            migrationBuilder.DropIndex(
                name: "IX_BankWebhookLog_IdempotencyKey",
                schema: "finance",
                table: "BankWebhookLog");

            migrationBuilder.DropIndex(
                name: "IX_BalanceSnapshot_SnapshotDate",
                schema: "finance",
                table: "BalanceSnapshot");

            migrationBuilder.DropColumn(
                name: "LastOrderAt",
                schema: "finance",
                table: "CustomerProfile");

            migrationBuilder.AlterColumn<int>(
                name: "BankAccountId",
                schema: "finance",
                table: "BankWebhookLog",
                type: "integer",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_Wallet_CustomerId",
                schema: "finance",
                table: "Wallet",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerKYC_CustomerId",
                schema: "finance",
                table: "CustomerKYC",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditLimit_CustomerId",
                schema: "finance",
                table: "CreditLimit",
                column: "CustomerId");
        }
    }
}
