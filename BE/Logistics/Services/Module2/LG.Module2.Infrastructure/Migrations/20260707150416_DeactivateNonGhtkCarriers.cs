using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DeactivateNonGhtkCarriers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000002"),
                column: "IsActive",
                value: false);

            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000003"),
                column: "IsActive",
                value: false);

            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000004"),
                column: "IsActive",
                value: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000002"),
                column: "IsActive",
                value: true);

            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000003"),
                column: "IsActive",
                value: true);

            migrationBuilder.UpdateData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000004"),
                column: "IsActive",
                value: true);
        }
    }
}
