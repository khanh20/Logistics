using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "mod1");

            migrationBuilder.CreateTable(
                name: "cancel_reasons",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    InitiatedBy = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PenaltyApplies = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cancel_reasons", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "deposit_configs",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    VipTierId = table.Column<Guid>(type: "uuid", nullable: true),
                    DepositPct = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    AppliesTo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deposit_configs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "exchange_rate_histories",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RateVndPerCny = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Source = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EffectiveTo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsCurrent = table.Column<bool>(type: "boolean", nullable: false),
                    SetBy = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rate_histories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "forbidden_categories",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    KeywordsCn = table.Column<string>(type: "text", nullable: true),
                    KeywordsVn = table.Column<string>(type: "text", nullable: true),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_forbidden_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "platforms",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    BaseUrl = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ApiProvider = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ApiKey = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ApiSecret = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CrawlConfigJson = table.Column<string>(type: "jsonb", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LogoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platforms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "product_categories",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    NameVn = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    NameCn = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Slug = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    IconUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_categories_product_categories_ParentId",
                        column: x => x.ParentId,
                        principalSchema: "mod1",
                        principalTable: "product_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "platform_accounts",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformId = table.Column<Guid>(type: "uuid", nullable: false),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordEncrypted = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AlipayBalance = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    DailySpendLimit = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    DailySpentToday = table.Column<decimal>(type: "numeric(14,2)", precision: 14, scale: 2, nullable: false),
                    IsFrozen = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_platform_accounts_platforms_PlatformId",
                        column: x => x.PlatformId,
                        principalSchema: "mod1",
                        principalTable: "platforms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "platform_shops",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopIdOnPlatform = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ShopName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ShopUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    InternalRating = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
                    TotalProductsCrawled = table.Column<int>(type: "integer", nullable: false),
                    AvgShipDays = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    DisputeRate = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    IsBlacklisted = table.Column<bool>(type: "boolean", nullable: false),
                    BlacklistReason = table.Column<string>(type: "text", nullable: true),
                    BlacklistedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_shops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_platform_shops_platforms_PlatformId",
                        column: x => x.PlatformId,
                        principalSchema: "mod1",
                        principalTable: "platforms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_masters",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformProductId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    OriginalTitle = table.Column<string>(type: "text", nullable: false),
                    TranslatedTitle = table.Column<string>(type: "text", nullable: true),
                    Slug = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    SeoDescription = table.Column<string>(type: "text", nullable: true),
                    OriginalUrl = table.Column<string>(type: "text", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    TotalSoldLocal = table.Column<int>(type: "integer", nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    IsForbidden = table.Column<bool>(type: "boolean", nullable: false),
                    ForbiddenCategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    LastPriceSyncedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CrawlTaskId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_masters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_masters_forbidden_categories_ForbiddenCategoryId",
                        column: x => x.ForbiddenCategoryId,
                        principalSchema: "mod1",
                        principalTable: "forbidden_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_product_masters_platform_shops_ShopId",
                        column: x => x.ShopId,
                        principalSchema: "mod1",
                        principalTable: "platform_shops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_product_masters_product_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "mod1",
                        principalTable: "product_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "product_attributes",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    KeyCn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    KeyVn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ValueCn = table.Column<string>(type: "text", nullable: true),
                    ValueVn = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_attributes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_attributes_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_images",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    SourceUrl = table.Column<string>(type: "text", nullable: false),
                    LocalCdnUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SourceUrlHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    WidthPx = table.Column<short>(type: "smallint", nullable: true),
                    HeightPx = table.Column<short>(type: "smallint", nullable: true),
                    FileSizeKb = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_images", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_images_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_variants",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    SkuIdOnPlatform = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    VariantName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TranslatedName = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PriceCnyCurrent = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PriceCnyMin = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    StockRaw = table.Column<int>(type: "integer", nullable: true),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_variants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_variants_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "product_price_tiers",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MinQuantity = table.Column<int>(type: "integer", nullable: false),
                    MaxQuantity = table.Column<int>(type: "integer", nullable: true),
                    PriceCny = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_price_tiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_price_tiers_product_variants_VariantId",
                        column: x => x.VariantId,
                        principalSchema: "mod1",
                        principalTable: "product_variants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "cancel_reasons",
                columns: new[] { "Id", "Code", "CreatedAt", "Description", "InitiatedBy", "IsActive", "PenaltyApplies" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000001"), "CUST_CHANGE_MIND", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Khách đổi ý / không muốn mua nữa", "Customer", true, false },
                    { new Guid("30000000-0000-0000-0000-000000000002"), "CUST_FOUND_CHEAPER", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Khách tìm được nơi rẻ hơn", "Customer", true, false },
                    { new Guid("30000000-0000-0000-0000-000000000003"), "STAFF_OUT_OF_STOCK", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Hết hàng trên sàn", "Staff", true, false },
                    { new Guid("30000000-0000-0000-0000-000000000004"), "STAFF_PRICE_CHANGED", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Giá thay đổi đáng kể (>10%)", "Staff", true, false },
                    { new Guid("30000000-0000-0000-0000-000000000005"), "CUST_AFTER_PURCHASE", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Khách hủy sau khi NV đã đặt hàng", "Customer", true, true },
                    { new Guid("30000000-0000-0000-0000-000000000006"), "SYS_DEPOSIT_TIMEOUT", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Hết thời gian đặt cọc (30 phút)", "System", true, false }
                });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "deposit_configs",
                columns: new[] { "Id", "AppliesTo", "CreatedAt", "CreatedBy", "DepositPct", "IsActive", "Name", "VipTierId" },
                values: new object[] { new Guid("40000000-0000-0000-0000-000000000001"), "All", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, 0.65m, true, "Mặc định 65%", null });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "exchange_rate_histories",
                columns: new[] { "Id", "EffectiveFrom", "EffectiveTo", "IsCurrent", "RateVndPerCny", "SetBy", "Source" },
                values: new object[] { new Guid("50000000-0000-0000-0000-000000000001"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, 3480m, null, "Manual" });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "forbidden_categories",
                columns: new[] { "Id", "CreatedAt", "CreatedBy", "IsActive", "KeywordsCn", "KeywordsVn", "Name", "Reason", "Severity" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "锂电池,锂电,li-ion电池,磷酸铁锂", "pin lithium,pin lipo,pin li-ion,pin 18650", "Pin Lithium rời", "Hàng cấm vận chuyển hàng không do nguy cơ cháy nổ", "Block" },
                    { new Guid("20000000-0000-0000-0000-000000000002"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "仿牌,高仿,复刻,1:1", "hàng nhái,hàng fake,replica,1:1", "Hàng nhái thương hiệu", "Vi phạm quyền sở hữu trí tuệ", "Block" },
                    { new Guid("20000000-0000-0000-0000-000000000003"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "易燃液体,打火机油,酒精", "chất lỏng dễ cháy,dầu bật lửa,cồn công nghiệp", "Chất lỏng dễ cháy", "Nguy hiểm cháy nổ khi vận chuyển hàng không", "Block" },
                    { new Guid("20000000-0000-0000-0000-000000000004"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "枪,刀,匕首,弹弓", "súng,dao,vũ khí,kích điện", "Vũ khí & phụ kiện", "Hàng cấm theo quy định pháp luật Việt Nam", "Block" },
                    { new Guid("20000000-0000-0000-0000-000000000005"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "生鲜,海鲜,肉类", "thực phẩm tươi,hải sản,thịt tươi", "Thực phẩm tươi sống", "Không đảm bảo an toàn thực phẩm khi vận chuyển quốc tế", "Block" }
                });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "platforms",
                columns: new[] { "Id", "ApiKey", "ApiProvider", "ApiSecret", "BaseUrl", "CrawlConfigJson", "CreatedAt", "IsActive", "LogoUrl", "Name" },
                values: new object[,]
                {
                    { new Guid("60000000-0000-0000-0000-000000000001"), null, "Apify", null, "https://www.taobao.com", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Taobao" },
                    { new Guid("60000000-0000-0000-0000-000000000002"), null, "Apify", null, "https://www.1688.com", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "1688" },
                    { new Guid("60000000-0000-0000-0000-000000000003"), null, "PublicApi", null, "https://www.aliexpress.com", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "AliExpress" },
                    { new Guid("60000000-0000-0000-0000-000000000004"), null, "PublicApi", null, "https://www.ebay.com", null, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "eBay" }
                });

            migrationBuilder.InsertData(
                schema: "mod1",
                table: "product_categories",
                columns: new[] { "Id", "CreatedAt", "IconUrl", "IsActive", "NameCn", "NameVn", "ParentId", "Slug", "SortOrder" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000001"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "服装", "Thời trang", null, "thoi-trang", 1 },
                    { new Guid("10000000-0000-0000-0000-000000000002"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "电子", "Điện tử", null, "dien-tu", 2 },
                    { new Guid("10000000-0000-0000-0000-000000000003"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "家居", "Gia dụng", null, "gia-dung", 3 },
                    { new Guid("10000000-0000-0000-0000-000000000004"), new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "配件", "Phụ kiện", null, "phu-kien", 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_cancel_reasons_Code",
                schema: "mod1",
                table: "cancel_reasons",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rate_histories_IsCurrent",
                schema: "mod1",
                table: "exchange_rate_histories",
                column: "IsCurrent");

            migrationBuilder.CreateIndex(
                name: "IX_platform_accounts_PlatformId_Username",
                schema: "mod1",
                table: "platform_accounts",
                columns: new[] { "PlatformId", "Username" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_platform_shops_PlatformId_ShopIdOnPlatform",
                schema: "mod1",
                table: "platform_shops",
                columns: new[] { "PlatformId", "ShopIdOnPlatform" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_platforms_Name",
                schema: "mod1",
                table: "platforms",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_attributes_ProductId",
                schema: "mod1",
                table: "product_attributes",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_ParentId",
                schema: "mod1",
                table: "product_categories",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_product_categories_Slug",
                schema: "mod1",
                table: "product_categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_images_ProductId",
                schema: "mod1",
                table: "product_images",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_product_images_SourceUrlHash",
                schema: "mod1",
                table: "product_images",
                column: "SourceUrlHash");

            migrationBuilder.CreateIndex(
                name: "IX_product_masters_CategoryId",
                schema: "mod1",
                table: "product_masters",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_product_masters_ForbiddenCategoryId",
                schema: "mod1",
                table: "product_masters",
                column: "ForbiddenCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_product_masters_ShopId_PlatformProductId",
                schema: "mod1",
                table: "product_masters",
                columns: new[] { "ShopId", "PlatformProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_masters_Slug",
                schema: "mod1",
                table: "product_masters",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_price_tiers_VariantId_MinQuantity",
                schema: "mod1",
                table: "product_price_tiers",
                columns: new[] { "VariantId", "MinQuantity" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_variants_ProductId",
                schema: "mod1",
                table: "product_variants",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cancel_reasons",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "deposit_configs",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "exchange_rate_histories",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "platform_accounts",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_attributes",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_images",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_price_tiers",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_variants",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_masters",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "forbidden_categories",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "platform_shops",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "product_categories",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "platforms",
                schema: "mod1");
        }
    }
}
