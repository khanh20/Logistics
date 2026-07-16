using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveNonGhtkCarriers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dọn dữ liệu demo tham chiếu 3 carrier sắp xoá (FK domestic_waybills.CarrierId
            // là Restrict). Các waybill này đều là stub — chỉ GHTK từng có vận đơn thật.
            // Lưu ý: phần dọn này KHÔNG khôi phục được khi Down (chỉ 3 carrier được insert lại).
            migrationBuilder.Sql("""
                DELETE FROM mod2.domestic_waybills
                WHERE "CarrierId" IN ('b0000000-0000-0000-0000-000000000002',
                                      'b0000000-0000-0000-0000-000000000003',
                                      'b0000000-0000-0000-0000-000000000004');

                UPDATE mod2.delivery_requests
                SET "DomesticCarrierId" = NULL
                WHERE "DomesticCarrierId" IN ('b0000000-0000-0000-0000-000000000002',
                                              'b0000000-0000-0000-0000-000000000003',
                                              'b0000000-0000-0000-0000-000000000004');
                """);

            migrationBuilder.DeleteData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000003"));

            migrationBuilder.DeleteData(
                schema: "mod2",
                table: "domestic_carriers",
                keyColumn: "Id",
                keyValue: new Guid("b0000000-0000-0000-0000-000000000004"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "mod2",
                table: "domestic_carriers",
                columns: new[] { "Id", "ApiEndpoint", "CreatedAt", "IsActive", "MaxValueVnd", "MaxWeightKg", "Name", "WebhookSecret" },
                values: new object[,]
                {
                    { new Guid("b0000000-0000-0000-0000-000000000002"), "https://online-gateway.ghn.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, 20000000m, 30m, "GHN", null },
                    { new Guid("b0000000-0000-0000-0000-000000000003"), "https://partner.viettelpost.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, 50000000m, 50m, "Viettel Post", null },
                    { new Guid("b0000000-0000-0000-0000-000000000004"), "https://api.jtexpress.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), false, 30000000m, 50m, "J&T Express", null }
                });
        }
    }
}
