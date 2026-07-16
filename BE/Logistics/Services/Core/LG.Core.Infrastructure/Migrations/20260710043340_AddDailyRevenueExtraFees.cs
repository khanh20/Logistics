using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyRevenueExtraFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DutyFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "EntrustmentFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalCollectedOnBehalfVnd",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "VatFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DutyFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "EntrustmentFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "TotalCollectedOnBehalfVnd",
                schema: "finance",
                table: "DailyRevenueReport");

            migrationBuilder.DropColumn(
                name: "VatFeeRevenueVnd",
                schema: "finance",
                table: "DailyRevenueReport");
        }
    }
}
