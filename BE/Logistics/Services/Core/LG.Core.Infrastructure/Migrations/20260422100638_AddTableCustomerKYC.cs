using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTableCustomerKYC : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CustomerKycs",
                table: "CustomerKycs");

            migrationBuilder.RenameTable(
                name: "CustomerKycs",
                newName: "CustomerKYC",
                newSchema: "finance");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CustomerKYC",
                schema: "finance",
                table: "CustomerKYC",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CustomerKYC",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.RenameTable(
                name: "CustomerKYC",
                schema: "finance",
                newName: "CustomerKycs");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CustomerKycs",
                table: "CustomerKycs",
                column: "Id");
        }
    }
}
