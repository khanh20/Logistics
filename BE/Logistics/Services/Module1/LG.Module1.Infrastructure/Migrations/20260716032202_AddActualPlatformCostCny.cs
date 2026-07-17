using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddActualPlatformCostCny : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualPlatformCostCny",
                schema: "mod1",
                table: "platform_orders",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmountCny",
                schema: "mod1",
                table: "platform_orders",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PlatformAccountId",
                schema: "mod1",
                table: "platform_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PlatformShippingFeeCny",
                schema: "mod1",
                table: "platform_orders",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualPlatformCostCny",
                schema: "mod1",
                table: "platform_orders");

            migrationBuilder.DropColumn(
                name: "DiscountAmountCny",
                schema: "mod1",
                table: "platform_orders");

            migrationBuilder.DropColumn(
                name: "PlatformAccountId",
                schema: "mod1",
                table: "platform_orders");

            migrationBuilder.DropColumn(
                name: "PlatformShippingFeeCny",
                schema: "mod1",
                table: "platform_orders");
        }
    }
}
