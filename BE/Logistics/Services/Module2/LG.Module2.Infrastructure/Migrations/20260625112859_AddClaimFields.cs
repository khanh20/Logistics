using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClaimFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                schema: "mod2",
                table: "missing_claims",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EvidenceUrls",
                schema: "mod2",
                table: "missing_claims",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ClaimedAmountVnd",
                schema: "mod2",
                table: "insurance_claims",
                type: "numeric(14,0)",
                precision: 14,
                scale: 0,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                schema: "mod2",
                table: "insurance_claims",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                schema: "mod2",
                table: "missing_claims");

            migrationBuilder.DropColumn(
                name: "EvidenceUrls",
                schema: "mod2",
                table: "missing_claims");

            migrationBuilder.DropColumn(
                name: "ClaimedAmountVnd",
                schema: "mod2",
                table: "insurance_claims");

            migrationBuilder.DropColumn(
                name: "Description",
                schema: "mod2",
                table: "insurance_claims");
        }
    }
}
