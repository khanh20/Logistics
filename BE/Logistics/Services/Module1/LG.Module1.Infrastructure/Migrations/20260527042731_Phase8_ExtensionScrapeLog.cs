using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase8_ExtensionScrapeLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "extension_scrape_logs",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Platform = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    PlatformProductId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ExtensionVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Success = table.Column<bool>(type: "boolean", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ConfidenceTier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_extension_scrape_logs", x => x.Id);
                });

            // Seed Tmall + Rakuten idempotent — bỏ qua nếu đã tồn tại (theo Id hoặc Name unique),
            // tránh duplicate key khi platform đã được tạo trước đó qua API/seed cũ.
            migrationBuilder.Sql(@"
                INSERT INTO mod1.platforms (""Id"", ""ApiKey"", ""ApiProvider"", ""ApiSecret"", ""BaseUrl"", ""CrawlConfigJson"", ""CreatedAt"", ""IsActive"", ""LogoUrl"", ""Name"")
                VALUES ('60000000-0000-0000-0000-000000000005', NULL, 'Apify', NULL, 'https://www.tmall.com', NULL, TIMESTAMPTZ '2024-01-01T00:00:00Z', TRUE, NULL, 'Tmall')
                ON CONFLICT DO NOTHING;");
            migrationBuilder.Sql(@"
                INSERT INTO mod1.platforms (""Id"", ""ApiKey"", ""ApiProvider"", ""ApiSecret"", ""BaseUrl"", ""CrawlConfigJson"", ""CreatedAt"", ""IsActive"", ""LogoUrl"", ""Name"")
                VALUES ('60000000-0000-0000-0000-000000000006', NULL, 'PublicApi', NULL, 'https://www.rakuten.co.jp', NULL, TIMESTAMPTZ '2024-01-01T00:00:00Z', TRUE, NULL, 'Rakuten')
                ON CONFLICT DO NOTHING;");

            migrationBuilder.CreateIndex(
                name: "IX_extension_scrape_logs_CustomerId",
                schema: "mod1",
                table: "extension_scrape_logs",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_extension_scrape_logs_Platform_Success_CreatedAt",
                schema: "mod1",
                table: "extension_scrape_logs",
                columns: new[] { "Platform", "Success", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "extension_scrape_logs",
                schema: "mod1");

            migrationBuilder.DeleteData(
                schema: "mod1",
                table: "platforms",
                keyColumn: "Id",
                keyValue: new Guid("60000000-0000-0000-0000-000000000005"));

            migrationBuilder.DeleteData(
                schema: "mod1",
                table: "platforms",
                keyColumn: "Id",
                keyValue: new Guid("60000000-0000-0000-0000-000000000006"));
        }
    }
}
