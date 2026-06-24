using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase9_ShippingAndFinalPayment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualWeightKg",
                schema: "mod1",
                table: "customer_orders",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingFeeVnd",
                schema: "mod1",
                table: "customer_orders",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "StorageDaysOverFree",
                schema: "mod1",
                table: "customer_orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "VolumeCm3",
                schema: "mod1",
                table: "customer_orders",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualWeightKg",
                schema: "mod1",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "ShippingFeeVnd",
                schema: "mod1",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "StorageDaysOverFree",
                schema: "mod1",
                table: "customer_orders");

            migrationBuilder.DropColumn(
                name: "VolumeCm3",
                schema: "mod1",
                table: "customer_orders");
        }
    }
}
