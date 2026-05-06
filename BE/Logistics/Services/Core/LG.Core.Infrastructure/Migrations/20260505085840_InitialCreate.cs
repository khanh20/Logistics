using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "finance");

            migrationBuilder.CreateTable(
                name: "BalanceSnapshot",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SnapshotDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalAvailableVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TotalFrozenVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TotalBalanceVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TotalActiveWallets = table.Column<int>(type: "integer", nullable: false),
                    TotalWalletsWithBalance = table.Column<int>(type: "integer", nullable: false),
                    VarianceFromPrev = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    IsReconciled = table.Column<bool>(type: "boolean", nullable: false),
                    ReconciledBy = table.Column<int>(type: "integer", nullable: true),
                    SnapshotAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BalanceSnapshot", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BankAccount",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BankCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AccountNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AccountHolder = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Branch = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    WebhookService = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankAccount", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BankWebhookLog",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BankAccountId = table.Column<int>(type: "integer", nullable: false),
                    IdempotencyKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RawPayload = table.Column<string>(type: "text", nullable: false),
                    BankRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    TransferContent = table.Column<string>(type: "text", nullable: true),
                    TransactionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MatchedTopupId = table.Column<int>(type: "integer", nullable: true),
                    ProcessingStatus = table.Column<int>(type: "integer", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankWebhookLog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CreditLimit",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    MaxCreditVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    CurrentDebtVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    DueDateDays = table.Column<short>(type: "smallint", nullable: false),
                    GrantedBy = table.Column<int>(type: "integer", nullable: true),
                    GrantedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CreditLimit", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerAddress",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    RecipientName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AddressLine = table.Column<string>(type: "text", nullable: false),
                    WardCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DistrictCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ProvinceCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Deleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerAddress", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerKYC",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    KycLevel = table.Column<int>(type: "integer", nullable: false),
                    IdNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    FullNameOnId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    DateOfBirthOnId = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IdFrontUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IdBackUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SelfieUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    VideoVerificationUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    ReviewedBy = table.Column<int>(type: "integer", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    KycExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerKYC", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerProfile",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    CustomerCode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    VipTierId = table.Column<int>(type: "integer", nullable: true),
                    FullName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Gender = table.Column<int>(type: "integer", nullable: true),
                    PreferredChannel = table.Column<int>(type: "integer", nullable: false),
                    ZaloUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ReferralCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ReferredById = table.Column<int>(type: "integer", nullable: true),
                    LifetimeValueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalOrders = table.Column<int>(type: "integer", nullable: false),
                    DeletedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Deleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedBy = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerProfile", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DailyRevenueReport",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReportDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ServiceFeeRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    ShipFeeRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    InspectionFeeRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    PenaltyRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    InsuranceFeeRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalRevenueVnd = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalOrdersCompleted = table.Column<int>(type: "integer", nullable: false),
                    TotalCnyPurchased = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalVndCollected = table.Column<decimal>(type: "numeric", nullable: false),
                    ExchangeRateAvg = table.Column<decimal>(type: "numeric", nullable: true),
                    ExchangeProfitLossVnd = table.Column<decimal>(type: "numeric", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyRevenueReport", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DebtRecord",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    CreditLimitId = table.Column<int>(type: "integer", nullable: false),
                    LinkedOrderId = table.Column<int>(type: "integer", nullable: true),
                    DebtAmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: false),
                    IsPaid = table.Column<bool>(type: "boolean", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReminderSentCount = table.Column<short>(type: "smallint", nullable: false),
                    IsOverdue = table.Column<bool>(type: "boolean", nullable: false),
                    OverdueSince = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DebtRecord", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeeRule",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VipTierId = table.Column<int>(type: "integer", nullable: true),
                    PlatformId = table.Column<int>(type: "integer", nullable: true),
                    ServiceFeePct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    IntlShipPerKgVnd = table.Column<decimal>(type: "numeric(10,0)", nullable: false),
                    IntlShipVolDivisor = table.Column<short>(type: "smallint", nullable: false),
                    MinChargeKg = table.Column<decimal>(type: "numeric(5,3)", nullable: false),
                    InspectionFeePct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    InspectionMinVnd = table.Column<decimal>(type: "numeric(10,0)", nullable: false),
                    InspectionMaxVnd = table.Column<decimal>(type: "numeric(10,0)", nullable: false),
                    InsuranceBasicPct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    InsuranceFullPct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    StorageDailyPerKgVnd = table.Column<decimal>(type: "numeric(10,0)", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    EffectiveTo = table.Column<DateOnly>(type: "date", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeRule", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FraudDetection",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    FraudType = table.Column<int>(type: "integer", nullable: true),
                    RiskScore = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    EvidenceJson = table.Column<string>(type: "text", nullable: true),
                    Action = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedBy = table.Column<int>(type: "integer", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolutionNote = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FraudDetection", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PaymentLock",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    LockType = table.Column<int>(type: "integer", nullable: false),
                    LockedAmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReleasedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReleaseReason = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentLock", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlatformReconcile",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReconcileDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PlatformId = table.Column<int>(type: "integer", nullable: false),
                    PlatformAccountId = table.Column<int>(type: "integer", nullable: false),
                    CnySpent = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    VndEquivalent = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    ServiceFeeCollectedVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    VarianceVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: true),
                    AlipayStatementUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    ReconciledBy = table.Column<int>(type: "integer", nullable: true),
                    ReconciledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlatformReconcile", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RefundProcess",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    TriggeredBy = table.Column<int>(type: "integer", nullable: true),
                    Reason = table.Column<int>(type: "integer", nullable: true),
                    ReferenceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ReferenceId = table.Column<int>(type: "integer", nullable: false),
                    GrossAmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    PenaltyPct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    PenaltyVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    NetRefundVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    WalletTransactionId = table.Column<int>(type: "integer", nullable: true),
                    RefundedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefundProcess", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TopupRequest",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    BankAccountId = table.Column<int>(type: "integer", nullable: false),
                    AmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TransferContent = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    QrUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AutoMatched = table.Column<bool>(type: "boolean", nullable: false),
                    MatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MatchedBankRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    WalletTransactionId = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TopupRequest", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TransactionType",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Direction = table.Column<int>(type: "integer", nullable: true),
                    IsReversible = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionType", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VipTier",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Level = table.Column<short>(type: "smallint", nullable: false),
                    MinSpendVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    ServiceFeeDiscountPct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    FreeInspection = table.Column<bool>(type: "boolean", nullable: false),
                    FreeStorageDays = table.Column<short>(type: "smallint", nullable: false),
                    PrioritySupport = table.Column<bool>(type: "boolean", nullable: false),
                    DepositPctOverride = table.Column<decimal>(type: "numeric(5,4)", nullable: true),
                    CashbackPct = table.Column<decimal>(type: "numeric(5,4)", nullable: false),
                    ColorHex = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VipTier", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Wallet",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    AvailableBalance = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    FrozenBalance = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TotalDepositedEver = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    TotalSpentEver = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    PendingRefundVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    IsFrozen = table.Column<bool>(type: "boolean", nullable: false),
                    FrozenReason = table.Column<string>(type: "text", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Wallet", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WalletTransaction",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    TypeId = table.Column<int>(type: "integer", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    BalanceBefore = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    ReferenceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ReferenceId = table.Column<int>(type: "integer", nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WalletTransaction", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WithdrawRequest",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WalletId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    BankName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BankAccountNo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AccountHolder = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    FeeVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    NetAmountVnd = table.Column<decimal>(type: "numeric(18,0)", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RejectedReason = table.Column<string>(type: "text", nullable: true),
                    ApprovedBy = table.Column<int>(type: "integer", nullable: true),
                    TransferRef = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WalletTransactionId = table.Column<int>(type: "integer", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ModifiedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WithdrawRequest", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ZaloNotification",
                schema: "finance",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    ZaloUserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TemplateType = table.Column<int>(type: "integer", nullable: true),
                    TemplateData = table.Column<string>(type: "text", nullable: true),
                    DeliveryStatus = table.Column<int>(type: "integer", nullable: false),
                    ZaloMessageId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedBy = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZaloNotification", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BalanceSnapshot",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "BankAccount",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "BankWebhookLog",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "CreditLimit",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "CustomerAddress",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "CustomerKYC",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "CustomerProfile",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "DailyRevenueReport",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "DebtRecord",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "FeeRule",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "FraudDetection",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "PaymentLock",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "PlatformReconcile",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "RefundProcess",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "TopupRequest",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "TransactionType",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "VipTier",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "Wallet",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "WalletTransaction",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "WithdrawRequest",
                schema: "finance");

            migrationBuilder.DropTable(
                name: "ZaloNotification",
                schema: "finance");
        }
    }
}
