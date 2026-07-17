using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficialQuotaToFeeRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ImportDutyPct",
                schema: "finance",
                table: "FeeRule",
                type: "numeric(5,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ImportEntrustmentMinVnd",
                schema: "finance",
                table: "FeeRule",
                type: "numeric(10,0)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ImportVatPct",
                schema: "finance",
                table: "FeeRule",
                type: "numeric(5,4)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImportDutyPct",
                schema: "finance",
                table: "FeeRule");

            migrationBuilder.DropColumn(
                name: "ImportEntrustmentMinVnd",
                schema: "finance",
                table: "FeeRule");

            migrationBuilder.DropColumn(
                name: "ImportVatPct",
                schema: "finance",
                table: "FeeRule");
        }
    }
}
