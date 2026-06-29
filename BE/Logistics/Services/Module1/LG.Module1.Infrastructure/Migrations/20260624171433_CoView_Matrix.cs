using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CoView_Matrix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "product_co_views",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    RelatedProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Score = table.Column<double>(type: "double precision", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_product_co_views", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_product_co_views_ProductId_RelatedProductId",
                schema: "mod1",
                table: "product_co_views",
                columns: new[] { "ProductId", "RelatedProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_co_views_ProductId_Score",
                schema: "mod1",
                table: "product_co_views",
                columns: new[] { "ProductId", "Score" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "product_co_views",
                schema: "mod1");
        }
    }
}
