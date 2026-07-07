using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StaffOps_Expansion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcceptedAt",
                schema: "mod1",
                table: "staff_assignments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                schema: "mod1",
                table: "staff_assignments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                schema: "mod1",
                table: "staff_assignments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "order_complaints",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    EvidenceUrls = table.Column<string>(type: "jsonb", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AssignedToStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    Resolution = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ResolvedAmountVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    HandledByStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_complaints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_complaints_customer_orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "mod1",
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "staff_notifications",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Body = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RefOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    IsRead = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_notifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "staff_performance_dailies",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    OrdersAssigned = table.Column<int>(type: "integer", nullable: false),
                    OrdersCompleted = table.Column<int>(type: "integer", nullable: false),
                    OnTimeCount = table.Column<int>(type: "integer", nullable: false),
                    OverdueCount = table.Column<int>(type: "integer", nullable: false),
                    CancelledCount = table.Column<int>(type: "integer", nullable: false),
                    TotalHandlingMinutes = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_performance_dailies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "staff_work_settings",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsAvailable = table.Column<bool>(type: "boolean", nullable: false),
                    AutoAssignEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MaxConcurrentOrders = table.Column<int>(type: "integer", nullable: false),
                    ShiftStartLocal = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    ShiftEndLocal = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_work_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "supplier_chat_logs",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    Direction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    ScreenshotUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PlatformChatTool = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supplier_chat_logs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_order_complaints_CustomerId",
                schema: "mod1",
                table: "order_complaints",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_order_complaints_OrderId",
                schema: "mod1",
                table: "order_complaints",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_complaints_Status_AssignedToStaffId",
                schema: "mod1",
                table: "order_complaints",
                columns: new[] { "Status", "AssignedToStaffId" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_notifications_StaffId_IsRead_CreatedAt",
                schema: "mod1",
                table: "staff_notifications",
                columns: new[] { "StaffId", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_staff_performance_dailies_StaffId_Date",
                schema: "mod1",
                table: "staff_performance_dailies",
                columns: new[] { "StaffId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_staff_work_settings_StaffId",
                schema: "mod1",
                table: "staff_work_settings",
                column: "StaffId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_supplier_chat_logs_OrderId_SentAt",
                schema: "mod1",
                table: "supplier_chat_logs",
                columns: new[] { "OrderId", "SentAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_complaints",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "staff_notifications",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "staff_performance_dailies",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "staff_work_settings",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "supplier_chat_logs",
                schema: "mod1");

            migrationBuilder.DropColumn(
                name: "AcceptedAt",
                schema: "mod1",
                table: "staff_assignments");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                schema: "mod1",
                table: "staff_assignments");

            migrationBuilder.DropColumn(
                name: "Status",
                schema: "mod1",
                table: "staff_assignments");
        }
    }
}
