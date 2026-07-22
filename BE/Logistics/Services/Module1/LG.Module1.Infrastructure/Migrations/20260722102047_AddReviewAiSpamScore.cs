using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewAiSpamScore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AiScannedAt",
                schema: "mod1",
                table: "product_reviews",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "AiSpamScore",
                schema: "mod1",
                table: "product_reviews",
                type: "double precision",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_product_reviews_Status_AiScannedAt",
                schema: "mod1",
                table: "product_reviews",
                columns: new[] { "Status", "AiScannedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_product_reviews_Status_AiScannedAt",
                schema: "mod1",
                table: "product_reviews");

            migrationBuilder.DropColumn(
                name: "AiScannedAt",
                schema: "mod1",
                table: "product_reviews");

            migrationBuilder.DropColumn(
                name: "AiSpamScore",
                schema: "mod1",
                table: "product_reviews");
        }
    }
}
