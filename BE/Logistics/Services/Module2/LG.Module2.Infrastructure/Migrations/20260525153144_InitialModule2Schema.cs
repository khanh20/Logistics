using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace LG.Module2.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialModule2Schema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "mod2");

            migrationBuilder.CreateTable(
                name: "ai_border_alerts",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AffectedBorder = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Severity = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    EstimatedDelayDays = table.Column<int>(type: "integer", nullable: true),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    NotifiedCustomersCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_border_alerts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ai_transit_forecasts",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OriginProvinceCn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    WeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: false),
                    CarrierCn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    BorderCrossing = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Season = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    EstDaysMin = table.Column<int>(type: "integer", nullable: false),
                    EstDaysMax = table.Column<int>(type: "integer", nullable: false),
                    ConfidencePct = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: false),
                    ForecastedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_transit_forecasts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "china_waybills",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WaybillNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CarrierCn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    ExpectedCnArrival = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_china_waybills", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "container_trips",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TripCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    VehiclePlate = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    DriverPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BorderCrossing = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DepartureCnAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EtaVnAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ArrivedVnAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_container_trips", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "delivery_requests",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DeliveryAddressId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreferredTimeSlot = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CodAmount = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    ShipFeeVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    DomesticCarrierId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_delivery_requests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "domestic_carriers",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ApiEndpoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    WebhookSecret = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    MaxWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: false),
                    MaxValueVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_domestic_carriers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "packages",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Barcode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    WaybillId = table.Column<Guid>(type: "uuid", nullable: true),
                    SackId = table.Column<Guid>(type: "uuid", nullable: true),
                    ZoneId = table.Column<Guid>(type: "uuid", nullable: true),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PackagingType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ActualWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    LengthCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    WidthCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    HeightCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    VolWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    ChargedWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    InsuranceOpted = table.Column<bool>(type: "boolean", nullable: false),
                    InsuranceLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_packages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "split_merge_histories",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ParentPackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChildPackageIds = table.Column<string>(type: "text", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DoneBy = table.Column<Guid>(type: "uuid", nullable: false),
                    DoneAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_split_merge_histories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "warehouses",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Country = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    MaxCapacityM3 = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "customs_clearances",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContainerTripId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ClearanceType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DeclaredValueVnd = table.Column<decimal>(type: "numeric(16,0)", precision: 16, scale: 0, nullable: true),
                    HsCodeSummary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CustomsOfficerName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    DutyPaidVnd = table.Column<decimal>(type: "numeric(16,0)", precision: 16, scale: 0, nullable: true),
                    HeldReason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ClearedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customs_clearances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_customs_clearances_container_trips_ContainerTripId",
                        column: x => x.ContainerTripId,
                        principalSchema: "mod2",
                        principalTable: "container_trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sacks",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SackCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ContainerTripId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    TotalWeightKg = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false),
                    TotalPackages = table.Column<int>(type: "integer", nullable: false),
                    SealCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sacks_container_trips_ContainerTripId",
                        column: x => x.ContainerTripId,
                        principalSchema: "mod2",
                        principalTable: "container_trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "domestic_waybills",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeliveryRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    CarrierId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackingNo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CarrierFeeVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    DeliveryAttemptCount = table.Column<int>(type: "integer", nullable: false),
                    FailedReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    LastStatusAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_domestic_waybills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_domestic_waybills_delivery_requests_DeliveryRequestId",
                        column: x => x.DeliveryRequestId,
                        principalSchema: "mod2",
                        principalTable: "delivery_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_domestic_waybills_domestic_carriers_CarrierId",
                        column: x => x.CarrierId,
                        principalSchema: "mod2",
                        principalTable: "domestic_carriers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "delivery_packages",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DeliveryRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_delivery_packages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_delivery_packages_delivery_requests_DeliveryRequestId",
                        column: x => x.DeliveryRequestId,
                        principalSchema: "mod2",
                        principalTable: "delivery_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_delivery_packages_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "insurance_claims",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    MissingClaimId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    DamagePhotos = table.Column<string>(type: "text", nullable: true),
                    AdjusterNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ApprovedAmount = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_insurance_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_insurance_claims_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "missing_claims",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ClaimedValueVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    InsuranceCoveragePct = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    ResolvedAmountVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: true),
                    Resolution = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StaffNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_missing_claims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_missing_claims_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "package_dimensions",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ActualWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: false),
                    LengthCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    WidthCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    HeightCm = table.Column<decimal>(type: "numeric(8,1)", precision: 8, scale: 1, nullable: true),
                    VolWeightKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    MeasuredBy = table.Column<Guid>(type: "uuid", nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    VarianceKg = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    MeasuredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_package_dimensions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_package_dimensions_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "package_images",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Url = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    UploadedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_package_images", x => x.Id);
                    table.ForeignKey(
                        name: "FK_package_images_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "package_item_maps",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_package_item_maps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_package_item_maps_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "storage_penalties",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerId = table.Column<Guid>(type: "uuid", nullable: false),
                    FreeDays = table.Column<int>(type: "integer", nullable: false),
                    TotalDays = table.Column<int>(type: "integer", nullable: false),
                    DailyRateVnd = table.Column<decimal>(type: "numeric(10,0)", precision: 10, scale: 0, nullable: false),
                    TotalFeeVnd = table.Column<decimal>(type: "numeric(14,0)", precision: 14, scale: 0, nullable: false),
                    IsCharged = table.Column<bool>(type: "boolean", nullable: false),
                    AutoChargedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_storage_penalties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_storage_penalties_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tracking_events",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    OccuredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tracking_events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tracking_events_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_dispatches",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    DispatchedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    DispatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_dispatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_dispatches_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_dispatches_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "mod2",
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_receipts",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    ScannedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Condition = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_receipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_receipts_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_warehouse_receipts_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "mod2",
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_staff",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    StaffName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_staff", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_staff_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "mod2",
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "warehouse_zones",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_warehouse_zones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_warehouse_zones_warehouses_WarehouseId",
                        column: x => x.WarehouseId,
                        principalSchema: "mod2",
                        principalTable: "warehouses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sack_package_maps",
                schema: "mod2",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SackId = table.Column<Guid>(type: "uuid", nullable: false),
                    PackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sack_package_maps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sack_package_maps_packages_PackageId",
                        column: x => x.PackageId,
                        principalSchema: "mod2",
                        principalTable: "packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sack_package_maps_sacks_SackId",
                        column: x => x.SackId,
                        principalSchema: "mod2",
                        principalTable: "sacks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "mod2",
                table: "domestic_carriers",
                columns: new[] { "Id", "ApiEndpoint", "CreatedAt", "IsActive", "MaxValueVnd", "MaxWeightKg", "Name", "WebhookSecret" },
                values: new object[,]
                {
                    { new Guid("b0000000-0000-0000-0000-000000000001"), "https://services.giaohangtietkiem.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 20000000m, 30m, "GHTK", null },
                    { new Guid("b0000000-0000-0000-0000-000000000002"), "https://online-gateway.ghn.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 20000000m, 30m, "GHN", null },
                    { new Guid("b0000000-0000-0000-0000-000000000003"), "https://partner.viettelpost.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 50000000m, 50m, "Viettel Post", null },
                    { new Guid("b0000000-0000-0000-0000-000000000004"), "https://api.jtexpress.vn", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, 30000000m, 50m, "J&T Express", null }
                });

            migrationBuilder.InsertData(
                schema: "mod2",
                table: "warehouses",
                columns: new[] { "Id", "Address", "City", "Country", "CreatedAt", "IsActive", "MaxCapacityM3", "Name", "Type" },
                values: new object[,]
                {
                    { new Guid("a0000000-0000-0000-0000-000000000001"), null, "Guangzhou", "CN", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Kho Quảng Châu", "ChinaTransit" },
                    { new Guid("a0000000-0000-0000-0000-000000000002"), null, "Lạng Sơn", "VN", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Kho Lạng Sơn", "VnHub" },
                    { new Guid("a0000000-0000-0000-0000-000000000003"), null, "Hà Nội", "VN", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Kho Hà Nội", "VnHub" },
                    { new Guid("a0000000-0000-0000-0000-000000000004"), null, "HCM", "VN", new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), true, null, "Kho HCM", "VnHub" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ai_border_alerts_AffectedBorder_IsActive",
                schema: "mod2",
                table: "ai_border_alerts",
                columns: new[] { "AffectedBorder", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_transit_forecasts_OriginProvinceCn_BorderCrossing",
                schema: "mod2",
                table: "ai_transit_forecasts",
                columns: new[] { "OriginProvinceCn", "BorderCrossing" });

            migrationBuilder.CreateIndex(
                name: "IX_china_waybills_WaybillNo",
                schema: "mod2",
                table: "china_waybills",
                column: "WaybillNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_container_trips_TripCode",
                schema: "mod2",
                table: "container_trips",
                column: "TripCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customs_clearances_ContainerTripId",
                schema: "mod2",
                table: "customs_clearances",
                column: "ContainerTripId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_packages_DeliveryRequestId_PackageId",
                schema: "mod2",
                table: "delivery_packages",
                columns: new[] { "DeliveryRequestId", "PackageId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_delivery_packages_PackageId",
                schema: "mod2",
                table: "delivery_packages",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_delivery_requests_CustomerId",
                schema: "mod2",
                table: "delivery_requests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_domestic_carriers_Name",
                schema: "mod2",
                table: "domestic_carriers",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_domestic_waybills_CarrierId",
                schema: "mod2",
                table: "domestic_waybills",
                column: "CarrierId");

            migrationBuilder.CreateIndex(
                name: "IX_domestic_waybills_DeliveryRequestId",
                schema: "mod2",
                table: "domestic_waybills",
                column: "DeliveryRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_domestic_waybills_TrackingNo",
                schema: "mod2",
                table: "domestic_waybills",
                column: "TrackingNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_insurance_claims_PackageId",
                schema: "mod2",
                table: "insurance_claims",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_missing_claims_CustomerId",
                schema: "mod2",
                table: "missing_claims",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_missing_claims_PackageId",
                schema: "mod2",
                table: "missing_claims",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_package_dimensions_PackageId",
                schema: "mod2",
                table: "package_dimensions",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_package_images_PackageId",
                schema: "mod2",
                table: "package_images",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_package_item_maps_PackageId_OrderItemId",
                schema: "mod2",
                table: "package_item_maps",
                columns: new[] { "PackageId", "OrderItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_packages_Barcode",
                schema: "mod2",
                table: "packages",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_packages_CustomerId",
                schema: "mod2",
                table: "packages",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_packages_OrderId",
                schema: "mod2",
                table: "packages",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_packages_Status",
                schema: "mod2",
                table: "packages",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_sack_package_maps_PackageId",
                schema: "mod2",
                table: "sack_package_maps",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_sack_package_maps_SackId_PackageId",
                schema: "mod2",
                table: "sack_package_maps",
                columns: new[] { "SackId", "PackageId" });

            migrationBuilder.CreateIndex(
                name: "IX_sacks_ContainerTripId",
                schema: "mod2",
                table: "sacks",
                column: "ContainerTripId");

            migrationBuilder.CreateIndex(
                name: "IX_sacks_SackCode",
                schema: "mod2",
                table: "sacks",
                column: "SackCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_storage_penalties_CustomerId_IsCharged",
                schema: "mod2",
                table: "storage_penalties",
                columns: new[] { "CustomerId", "IsCharged" });

            migrationBuilder.CreateIndex(
                name: "IX_storage_penalties_PackageId",
                schema: "mod2",
                table: "storage_penalties",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_tracking_events_PackageId_OccuredAt",
                schema: "mod2",
                table: "tracking_events",
                columns: new[] { "PackageId", "OccuredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_dispatches_PackageId",
                schema: "mod2",
                table: "warehouse_dispatches",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_dispatches_WarehouseId",
                schema: "mod2",
                table: "warehouse_dispatches",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_receipts_PackageId",
                schema: "mod2",
                table: "warehouse_receipts",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_receipts_WarehouseId",
                schema: "mod2",
                table: "warehouse_receipts",
                column: "WarehouseId");

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_staff_WarehouseId_StaffId",
                schema: "mod2",
                table: "warehouse_staff",
                columns: new[] { "WarehouseId", "StaffId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_warehouse_zones_WarehouseId_Code",
                schema: "mod2",
                table: "warehouse_zones",
                columns: new[] { "WarehouseId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ai_border_alerts",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "ai_transit_forecasts",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "china_waybills",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "customs_clearances",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "delivery_packages",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "domestic_waybills",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "insurance_claims",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "missing_claims",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "package_dimensions",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "package_images",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "package_item_maps",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "sack_package_maps",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "split_merge_histories",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "storage_penalties",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "tracking_events",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "warehouse_dispatches",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "warehouse_receipts",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "warehouse_staff",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "warehouse_zones",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "delivery_requests",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "domestic_carriers",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "sacks",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "packages",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "warehouses",
                schema: "mod2");

            migrationBuilder.DropTable(
                name: "container_trips",
                schema: "mod2");
        }
    }
}
