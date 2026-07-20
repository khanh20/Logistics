using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyRevenueAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.AddColumn<bool>(
                name: "Deleted",
                schema: "finance",
                table: "PlatformReconcile",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedBy",
                schema: "finance",
                table: "PlatformReconcile",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedDate",
                schema: "finance",
                table: "PlatformReconcile",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModifiedBy",
                schema: "finance",
                table: "PlatformReconcile",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedDate",
                schema: "finance",
                table: "PlatformReconcile",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Deleted",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedBy",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedDate",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ModifiedBy",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedDate",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Deleted",
                schema: "finance",
                table: "PlatformReconcile");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "finance",
                table: "PlatformReconcile");

            migrationBuilder.DropColumn(
                name: "DeletedDate",
                schema: "finance",
                table: "PlatformReconcile");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "finance",
                table: "PlatformReconcile");

            migrationBuilder.DropColumn(
                name: "ModifiedDate",
                schema: "finance",
                table: "PlatformReconcile");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "Deleted",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "DeletedDate",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "ModifiedDate",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
