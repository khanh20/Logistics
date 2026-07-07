using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Recommendation_Trending : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trending_products",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<double>(type: "double precision", nullable: false),
                    Rank = table.Column<int>(type: "integer", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trending_products", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_trending_products_ProductId",
                schema: "mod1",
                table: "trending_products",
                column: "ProductId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trending_products_Rank",
                schema: "mod1",
                table: "trending_products",
                column: "Rank");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "trending_products",
                schema: "mod1");
        }
    }
}
