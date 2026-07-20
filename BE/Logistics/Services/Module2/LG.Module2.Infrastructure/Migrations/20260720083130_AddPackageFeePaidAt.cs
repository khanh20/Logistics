using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPackageFeePaidAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FeePaidAt",
                schema: "mod2",
                table: "packages",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeePaidAt",
                schema: "mod2",
                table: "packages");
        }
    }
}
