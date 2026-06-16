using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Core.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAcc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Gender",
                schema: "finance",
                table: "CustomerKYC",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nationality",
                schema: "finance",
                table: "CustomerKYC",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceOfOrigin",
                schema: "finance",
                table: "CustomerKYC",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PlaceOfResidence",
                schema: "finance",
                table: "CustomerKYC",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                schema: "finance",
                table: "BankAccount",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                schema: "finance",
                table: "BankAccount",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Gender",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropColumn(
                name: "Nationality",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropColumn(
                name: "PlaceOfOrigin",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropColumn(
                name: "PlaceOfResidence",
                schema: "finance",
                table: "CustomerKYC");

            migrationBuilder.DropColumn(
                name: "Type",
                schema: "finance",
                table: "BankAccount");

            migrationBuilder.DropColumn(
                name: "UserId",
                schema: "finance",
                table: "BankAccount");
        }
    }
}
