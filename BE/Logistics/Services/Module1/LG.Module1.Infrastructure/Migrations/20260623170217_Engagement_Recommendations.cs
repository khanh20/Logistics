using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Engagement_Recommendations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "product_reviews",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RejectReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ModeratedByStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModeratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_reviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_product_reviews_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_activity_events",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: true),
                    SessionKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: true),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Keyword = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_activity_events", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "user_favorites",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_favorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_favorites_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_product_reviews_CustomerId",
                schema: "mod1",
                table: "product_reviews",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_product_reviews_ProductId_Status",
                schema: "mod1",
                table: "product_reviews",
                columns: new[] { "ProductId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_user_activity_events_CustomerId_CreatedAt",
                schema: "mod1",
                table: "user_activity_events",
                columns: new[] { "CustomerId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_user_activity_events_ProductId_EventType",
                schema: "mod1",
                table: "user_activity_events",
                columns: new[] { "ProductId", "EventType" });

            migrationBuilder.CreateIndex(
                name: "IX_user_activity_events_SessionKey",
                schema: "mod1",
                table: "user_activity_events",
                column: "SessionKey");

            migrationBuilder.CreateIndex(
                name: "IX_user_favorites_CustomerId",
                schema: "mod1",
                table: "user_favorites",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_user_favorites_CustomerId_ProductId",
                schema: "mod1",
                table: "user_favorites",
                columns: new[] { "CustomerId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_favorites_ProductId",
                schema: "mod1",
                table: "user_favorites",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_reviews",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "user_activity_events",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "user_favorites",
                schema: "mod1");
        }
    }
}
