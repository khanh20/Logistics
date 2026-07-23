using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCashbackPctFromVipTier : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CashbackPct",
                schema: "finance",
                table: "VipTier");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CashbackPct",
                schema: "finance",
                table: "VipTier",
                type: "numeric(5,4)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
