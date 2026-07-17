using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPackageInternationalFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DeclaredValueVnd",
                schema: "mod2",
                table: "packages",
                type: "numeric(16,0)",
                precision: 16,
                scale: 0,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FeeCalculatedAt",
                schema: "mod2",
                table: "packages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FeeRatePerKgVnd",
                schema: "mod2",
                table: "packages",
                type: "numeric(12,0)",
                precision: 12,
                scale: 0,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InsuranceFeeVnd",
                schema: "mod2",
                table: "packages",
                type: "numeric(16,0)",
                precision: 16,
                scale: 0,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShipIntlVnd",
                schema: "mod2",
                table: "packages",
                type: "numeric(16,0)",
                precision: 16,
                scale: 0,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeclaredValueVnd",
                schema: "mod2",
                table: "packages");

            migrationBuilder.DropColumn(
                name: "FeeCalculatedAt",
                schema: "mod2",
                table: "packages");

            migrationBuilder.DropColumn(
                name: "FeeRatePerKgVnd",
                schema: "mod2",
                table: "packages");

            migrationBuilder.DropColumn(
                name: "InsuranceFeeVnd",
                schema: "mod2",
                table: "packages");

            migrationBuilder.DropColumn(
                name: "ShipIntlVnd",
                schema: "mod2",
                table: "packages");
        }
    }
}
