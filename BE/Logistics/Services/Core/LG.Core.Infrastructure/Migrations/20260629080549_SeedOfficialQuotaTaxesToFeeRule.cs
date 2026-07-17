using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SeedOfficialQuotaTaxesToFeeRule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE finance.\"FeeRule\" SET \"ImportDutyPct\" = 0.05, \"ImportVatPct\" = 0.10, \"ImportEntrustmentMinVnd\" = 500000;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
