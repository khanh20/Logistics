using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFinanceForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Clean up orphan records before applying foreign key constraints
            // This is critical because mismatched data will cause the migration to fail.

            // Clean CustomerAddress orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""CustomerAddress"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean CustomerKYC orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""CustomerKYC"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean Wallet orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""Wallet"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean CreditLimit orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""CreditLimit"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean DebtRecord orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""DebtRecord"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"") 
                   OR ""CreditLimitId"" NOT IN (SELECT ""Id"" FROM finance.""CreditLimit"");
            ");

            // Clean PaymentLock orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""PaymentLock"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"");
            ");

            // Clean WalletTransaction orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""WalletTransaction"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"") 
                   OR ""TypeId"" NOT IN (SELECT ""Id"" FROM finance.""TransactionType"");
            ");

            // Clean TopupRequest orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""TopupRequest"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"") 
                   OR ""BankAccountId"" NOT IN (SELECT ""Id"" FROM finance.""BankAccount"");
            ");

            // Clean WithdrawRequest orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""WithdrawRequest"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"") 
                   OR ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean RefundProcess orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""RefundProcess"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"");
            ");

            // Clean FraudDetection orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""FraudDetection"" 
                WHERE ""WalletId"" NOT IN (SELECT ""Id"" FROM finance.""Wallet"") 
                   OR ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean EmailNotification orphans
            migrationBuilder.Sql(@"
                DELETE FROM finance.""EmailNotification"" 
                WHERE ""CustomerId"" NOT IN (SELECT ""UserId"" FROM finance.""CustomerProfile"");
            ");

            // Clean FeeRule orphans (set VipTierId to NULL if VipTier doesn't exist)
            migrationBuilder.Sql(@"
                UPDATE finance.""FeeRule"" 
                SET ""VipTierId"" = NULL 
                WHERE ""VipTierId"" IS NOT NULL 
                  AND ""VipTierId"" NOT IN (SELECT ""Id"" FROM finance.""VipTier"");
            ");

            // 2. Ensure Unique Constraint (Alternate Key) exists on CustomerProfile.UserId
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AK_CustomerProfile_UserId') THEN
                        ALTER TABLE finance.""CustomerProfile"" ADD CONSTRAINT ""AK_CustomerProfile_UserId"" UNIQUE (""UserId"");
                    END IF;
                END;
                $$;
            ");

            // 3. Create Indexes
            migrationBuilder.CreateIndex(
                name: "IX_BankWebhookLog_MatchedTopupId",
                schema: "finance",
                table: "BankWebhookLog",
                column: "MatchedTopupId");

            migrationBuilder.CreateIndex(
                name: "IX_CreditLimit_CustomerId",
                schema: "finance",
                table: "CreditLimit",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerAddress_CustomerId",
                schema: "finance",
                table: "CustomerAddress",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerKYC_CustomerId",
                schema: "finance",
                table: "CustomerKYC",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerProfile_UserId",
                schema: "finance",
                table: "CustomerProfile",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerProfile_VipTierId",
                schema: "finance",
                table: "CustomerProfile",
                column: "VipTierId");

            migrationBuilder.CreateIndex(
                name: "IX_DebtRecord_CreditLimitId",
                schema: "finance",
                table: "DebtRecord",
                column: "CreditLimitId");

            migrationBuilder.CreateIndex(
                name: "IX_DebtRecord_CustomerId",
                schema: "finance",
                table: "DebtRecord",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailNotification_CustomerId",
                schema: "finance",
                table: "EmailNotification",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeRule_VipTierId",
                schema: "finance",
                table: "FeeRule",
                column: "VipTierId");

            migrationBuilder.CreateIndex(
                name: "IX_FraudDetection_CustomerId",
                schema: "finance",
                table: "FraudDetection",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_FraudDetection_WalletId",
                schema: "finance",
                table: "FraudDetection",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentLock_WalletId",
                schema: "finance",
                table: "PaymentLock",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_RefundProcess_WalletId",
                schema: "finance",
                table: "RefundProcess",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_TopupRequest_BankAccountId",
                schema: "finance",
                table: "TopupRequest",
                column: "BankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_TopupRequest_WalletId",
                schema: "finance",
                table: "TopupRequest",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_Wallet_CustomerId",
                schema: "finance",
                table: "Wallet",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_TypeId",
                schema: "finance",
                table: "WalletTransaction",
                column: "TypeId");

            migrationBuilder.CreateIndex(
                name: "IX_WalletTransaction_WalletId",
                schema: "finance",
                table: "WalletTransaction",
                column: "WalletId");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawRequest_CustomerId",
                schema: "finance",
                table: "WithdrawRequest",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_WithdrawRequest_WalletId",
                schema: "finance",
                table: "WithdrawRequest",
                column: "WalletId");

            // 4. Add Foreign Keys
            migrationBuilder.AddForeignKey(
                name: "FK_CustomerProfile_VipTier_VipTierId",
                schema: "finance",
                table: "CustomerProfile",
                column: "VipTierId",
                principalSchema: "finance",
                principalTable: "VipTier",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FeeRule_VipTier_VipTierId",
                schema: "finance",
                table: "FeeRule",
                column: "VipTierId",
                principalSchema: "finance",
                principalTable: "VipTier",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CreditLimit_CustomerProfile_CustomerId",
                schema: "finance",
                table: "CreditLimit",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomerAddress_CustomerProfile_CustomerId",
                schema: "finance",
                table: "CustomerAddress",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CustomerKYC_CustomerProfile_CustomerId",
                schema: "finance",
                table: "CustomerKYC",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmailNotification_CustomerProfile_CustomerId",
                schema: "finance",
                table: "EmailNotification",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Wallet_CustomerProfile_CustomerId",
                schema: "finance",
                table: "Wallet",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DebtRecord_CreditLimit_CreditLimitId",
                schema: "finance",
                table: "DebtRecord",
                column: "CreditLimitId",
                principalSchema: "finance",
                principalTable: "CreditLimit",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_DebtRecord_CustomerProfile_CustomerId",
                schema: "finance",
                table: "DebtRecord",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FraudDetection_CustomerProfile_CustomerId",
                schema: "finance",
                table: "FraudDetection",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_FraudDetection_Wallet_WalletId",
                schema: "finance",
                table: "FraudDetection",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PaymentLock_Wallet_WalletId",
                schema: "finance",
                table: "PaymentLock",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefundProcess_Wallet_WalletId",
                schema: "finance",
                table: "RefundProcess",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TopupRequest_BankAccount_BankAccountId",
                schema: "finance",
                table: "TopupRequest",
                column: "BankAccountId",
                principalSchema: "finance",
                principalTable: "BankAccount",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TopupRequest_Wallet_WalletId",
                schema: "finance",
                table: "TopupRequest",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_TransactionType_TypeId",
                schema: "finance",
                table: "WalletTransaction",
                column: "TypeId",
                principalSchema: "finance",
                principalTable: "TransactionType",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WalletTransaction_Wallet_WalletId",
                schema: "finance",
                table: "WalletTransaction",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WithdrawRequest_CustomerProfile_CustomerId",
                schema: "finance",
                table: "WithdrawRequest",
                column: "CustomerId",
                principalSchema: "finance",
                principalTable: "CustomerProfile",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WithdrawRequest_Wallet_WalletId",
                schema: "finance",
                table: "WithdrawRequest",
                column: "WalletId",
                principalSchema: "finance",
                principalTable: "Wallet",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_BankWebhookLog_TopupRequest_MatchedTopupId",
                schema: "finance",
                table: "BankWebhookLog",
                column: "MatchedTopupId",
                principalSchema: "finance",
                principalTable: "TopupRequest",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop Foreign Keys
            migrationBuilder.DropForeignKey(name: "FK_CustomerProfile_VipTier_VipTierId", schema: "finance", table: "CustomerProfile");
            migrationBuilder.DropForeignKey(name: "FK_FeeRule_VipTier_VipTierId", schema: "finance", table: "FeeRule");
            migrationBuilder.DropForeignKey(name: "FK_CreditLimit_CustomerProfile_CustomerId", schema: "finance", table: "CreditLimit");
            migrationBuilder.DropForeignKey(name: "FK_CustomerAddress_CustomerProfile_CustomerId", schema: "finance", table: "CustomerAddress");
            migrationBuilder.DropForeignKey(name: "FK_CustomerKYC_CustomerProfile_CustomerId", schema: "finance", table: "CustomerKYC");
            migrationBuilder.DropForeignKey(name: "FK_EmailNotification_CustomerProfile_CustomerId", schema: "finance", table: "EmailNotification");
            migrationBuilder.DropForeignKey(name: "FK_Wallet_CustomerProfile_CustomerId", schema: "finance", table: "Wallet");
            migrationBuilder.DropForeignKey(name: "FK_DebtRecord_CreditLimit_CreditLimitId", schema: "finance", table: "DebtRecord");
            migrationBuilder.DropForeignKey(name: "FK_DebtRecord_CustomerProfile_CustomerId", schema: "finance", table: "DebtRecord");
            migrationBuilder.DropForeignKey(name: "FK_FraudDetection_CustomerProfile_CustomerId", schema: "finance", table: "FraudDetection");
            migrationBuilder.DropForeignKey(name: "FK_FraudDetection_Wallet_WalletId", schema: "finance", table: "FraudDetection");
            migrationBuilder.DropForeignKey(name: "FK_PaymentLock_Wallet_WalletId", schema: "finance", table: "PaymentLock");
            migrationBuilder.DropForeignKey(name: "FK_RefundProcess_Wallet_WalletId", schema: "finance", table: "RefundProcess");
            migrationBuilder.DropForeignKey(name: "FK_TopupRequest_BankAccount_BankAccountId", schema: "finance", table: "TopupRequest");
            migrationBuilder.DropForeignKey(name: "FK_TopupRequest_Wallet_WalletId", schema: "finance", table: "TopupRequest");
            migrationBuilder.DropForeignKey(name: "FK_WalletTransaction_TransactionType_TypeId", schema: "finance", table: "WalletTransaction");
            migrationBuilder.DropForeignKey(name: "FK_WalletTransaction_Wallet_WalletId", schema: "finance", table: "WalletTransaction");
            migrationBuilder.DropForeignKey(name: "FK_WithdrawRequest_CustomerProfile_CustomerId", schema: "finance", table: "WithdrawRequest");
            migrationBuilder.DropForeignKey(name: "FK_WithdrawRequest_Wallet_WalletId", schema: "finance", table: "WithdrawRequest");
            migrationBuilder.DropForeignKey(name: "FK_BankWebhookLog_TopupRequest_MatchedTopupId", schema: "finance", table: "BankWebhookLog");

            // Drop Unique Constraint
            migrationBuilder.Sql("ALTER TABLE finance.\"CustomerProfile\" DROP CONSTRAINT IF EXISTS \"AK_CustomerProfile_UserId\";");

            // Drop Indexes
            migrationBuilder.DropIndex(name: "IX_BankWebhookLog_MatchedTopupId", schema: "finance", table: "BankWebhookLog");
            migrationBuilder.DropIndex(name: "IX_CreditLimit_CustomerId", schema: "finance", table: "CreditLimit");
            migrationBuilder.DropIndex(name: "IX_CustomerAddress_CustomerId", schema: "finance", table: "CustomerAddress");
            migrationBuilder.DropIndex(name: "IX_CustomerKYC_CustomerId", schema: "finance", table: "CustomerKYC");
            migrationBuilder.DropIndex(name: "IX_CustomerProfile_UserId", schema: "finance", table: "CustomerProfile");
            migrationBuilder.DropIndex(name: "IX_CustomerProfile_VipTierId", schema: "finance", table: "CustomerProfile");
            migrationBuilder.DropIndex(name: "IX_DebtRecord_CreditLimitId", schema: "finance", table: "DebtRecord");
            migrationBuilder.DropIndex(name: "IX_DebtRecord_CustomerId", schema: "finance", table: "DebtRecord");
            migrationBuilder.DropIndex(name: "IX_EmailNotification_CustomerId", schema: "finance", table: "EmailNotification");
            migrationBuilder.DropIndex(name: "IX_FeeRule_VipTierId", schema: "finance", table: "FeeRule");
            migrationBuilder.DropIndex(name: "IX_FraudDetection_CustomerId", schema: "finance", table: "FraudDetection");
            migrationBuilder.DropIndex(name: "IX_FraudDetection_WalletId", schema: "finance", table: "FraudDetection");
            migrationBuilder.DropIndex(name: "IX_PaymentLock_WalletId", schema: "finance", table: "PaymentLock");
            migrationBuilder.DropIndex(name: "IX_RefundProcess_WalletId", schema: "finance", table: "RefundProcess");
            migrationBuilder.DropIndex(name: "IX_TopupRequest_BankAccountId", schema: "finance", table: "TopupRequest");
            migrationBuilder.DropIndex(name: "IX_TopupRequest_WalletId", schema: "finance", table: "TopupRequest");
            migrationBuilder.DropIndex(name: "IX_Wallet_CustomerId", schema: "finance", table: "Wallet");
            migrationBuilder.DropIndex(name: "IX_WalletTransaction_TypeId", schema: "finance", table: "WalletTransaction");
            migrationBuilder.DropIndex(name: "IX_WalletTransaction_WalletId", schema: "finance", table: "WalletTransaction");
            migrationBuilder.DropIndex(name: "IX_WithdrawRequest_CustomerId", schema: "finance", table: "WithdrawRequest");
            migrationBuilder.DropIndex(name: "IX_WithdrawRequest_WalletId", schema: "finance", table: "WithdrawRequest");
        }
    }
}
