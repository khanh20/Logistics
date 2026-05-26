using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LG.Module1.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Phase6_7_CartAndOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IntegrationApiTokenEncrypted",
                schema: "mod1",
                table: "platform_shops",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntegrationApiUrl",
                schema: "mod1",
                table: "platform_shops",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntegrationMode",
                schema: "mod1",
                table: "platform_shops",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "carts",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConvertedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AbandonedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_carts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "customer_orders",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderCode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PlacementMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TotalCny = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    RateVndPerCny = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    FinalAmountVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    DepositPct = table.Column<decimal>(type: "numeric(5,4)", precision: 5, scale: 4, nullable: false),
                    DepositVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    IsDepositPaid = table.Column<bool>(type: "boolean", nullable: false),
                    IsFinalPaid = table.Column<bool>(type: "boolean", nullable: false),
                    DeliveryAddressNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CustomerNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    StaffNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CancelReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AssignedStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaymentDeadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customer_orders_platform_shops_ShopId",
                        column: x => x.ShopId,
                        principalSchema: "mod1",
                        principalTable: "platform_shops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cart_items",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CartId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    PriceCnySnapshot = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    ProductTitleSnapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VariantNameSnapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ImageUrlSnapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cart_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cart_items_carts_CartId",
                        column: x => x.CartId,
                        principalSchema: "mod1",
                        principalTable: "carts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_cart_items_platform_shops_ShopId",
                        column: x => x.ShopId,
                        principalSchema: "mod1",
                        principalTable: "platform_shops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cart_items_product_masters_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "mod1",
                        principalTable: "product_masters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cart_items_product_variants_VariantId",
                        column: x => x.VariantId,
                        principalSchema: "mod1",
                        principalTable: "product_variants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "order_fee_details",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    FeeType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AmountVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_fee_details", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_fee_details_customer_orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "mod1",
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_items",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductTitleSnapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VariantNameSnapshot = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceCny = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TotalCny = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_items_customer_orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "mod1",
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "order_status_histories",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ToStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ChangedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ChangedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_order_status_histories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_order_status_histories_customer_orders_OrderId",
                        column: x => x.OrderId,
                        principalSchema: "mod1",
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "platform_orders",
                schema: "mod1",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlatformOrderId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedByStaff = table.Column<Guid>(type: "uuid", nullable: true),
                    TrackingNumber = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    TrackingCarrier = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TrackingUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    HasIssue = table.Column<bool>(type: "boolean", nullable: false),
                    IssueNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_platform_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_platform_orders_customer_orders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalSchema: "mod1",
                        principalTable: "customer_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cart_items_CartId_VariantId",
                schema: "mod1",
                table: "cart_items",
                columns: new[] { "CartId", "VariantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cart_items_ProductId",
                schema: "mod1",
                table: "cart_items",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_cart_items_ShopId",
                schema: "mod1",
                table: "cart_items",
                column: "ShopId");

            migrationBuilder.CreateIndex(
                name: "IX_cart_items_VariantId",
                schema: "mod1",
                table: "cart_items",
                column: "VariantId");

            migrationBuilder.CreateIndex(
                name: "IX_carts_CustomerId_Status",
                schema: "mod1",
                table: "carts",
                columns: new[] { "CustomerId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_AssignedStaffId",
                schema: "mod1",
                table: "customer_orders",
                column: "AssignedStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_CustomerId",
                schema: "mod1",
                table: "customer_orders",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_OrderCode",
                schema: "mod1",
                table: "customer_orders",
                column: "OrderCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_ShopId",
                schema: "mod1",
                table: "customer_orders",
                column: "ShopId");

            migrationBuilder.CreateIndex(
                name: "IX_customer_orders_Status",
                schema: "mod1",
                table: "customer_orders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_order_fee_details_OrderId",
                schema: "mod1",
                table: "order_fee_details",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_items_OrderId",
                schema: "mod1",
                table: "order_items",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_order_status_histories_OrderId",
                schema: "mod1",
                table: "order_status_histories",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_platform_orders_CustomerOrderId",
                schema: "mod1",
                table: "platform_orders",
                column: "CustomerOrderId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cart_items",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "order_fee_details",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "order_items",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "order_status_histories",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "platform_orders",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "carts",
                schema: "mod1");

            migrationBuilder.DropTable(
                name: "customer_orders",
                schema: "mod1");

            migrationBuilder.DropColumn(
                name: "IntegrationApiTokenEncrypted",
                schema: "mod1",
                table: "platform_shops");

            migrationBuilder.DropColumn(
                name: "IntegrationApiUrl",
                schema: "mod1",
                table: "platform_shops");

            migrationBuilder.DropColumn(
                name: "IntegrationMode",
                schema: "mod1",
                table: "platform_shops");
        }
    }
}
