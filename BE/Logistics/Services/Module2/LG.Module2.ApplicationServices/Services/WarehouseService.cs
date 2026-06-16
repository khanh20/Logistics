using LG.Module2.ApplicationServices.DTOs.Warehouse;
using LG.Module2.ApplicationServices.Interfaces;
using LG.Module2.Domain.Entities;
using LG.Module2.Domain.Exceptions;
using LG.Module2.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module2.ApplicationServices.Services;

public class WarehouseService(
    IWarehouseRepository     warehouseRepo,
    IWarehouseZoneRepository zoneRepo,
    IPackageRepository       packageRepo,
    IChinaWaybillRepository  waybillRepo,
    IWarehouseReceiptRepository receiptRepo,
    ITrackingEventRepository trackingRepo,
    INotificationService     notifyService,
    IModule2UnitOfWork       uow,
    ILogger<WarehouseService> logger
) : IWarehouseService
{
    private const decimal VarianceAlertThreshold = 0.10m;  // 10%

    public async Task<List<WarehouseResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await warehouseRepo.GetAllActiveAsync(ct);
        return list.Select(MapWarehouse).ToList();
    }

    public async Task<WarehouseResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var w = await warehouseRepo.GetByIdAsync(id, ct)
                ?? throw new WarehouseNotFoundException(id);
        return MapWarehouse(w);
    }

    // ── UC-2.01: Nhập kho TQ & cân đo ────────────────────────────────────────
    public async Task<ReceiveScanResult> ReceiveAtChinaWarehouseAsync(
        Guid warehouseId, Guid staffId, CnWarehouseReceiveRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var warehouse = await warehouseRepo.GetByIdAsync(warehouseId, innerCt)
                            ?? throw new WarehouseNotFoundException(warehouseId);

            var package = await packageRepo.GetByBarcodeAsync(req.Barcode, innerCt)
                          ?? throw new PackageNotFoundException(req.Barcode);

            // Xác nhận + gắn mã vận đơn TQ nếu cung cấp
            if (!string.IsNullOrWhiteSpace(req.WaybillNo))
            {
                var waybill = await waybillRepo.GetByWaybillNoAsync(req.WaybillNo, innerCt);
                if (waybill is not null)
                    package.AssignWaybill(waybill.Id);
            }

            // Cân/đo — cập nhật Package
            var previousWeight = package.ActualWeightKg;
            package.RecordMeasurement(req.ActualWeightKg, req.LengthCm, req.WidthCm, req.HeightCm);

            // Tính variance so với lần cân trước (nếu có)
            var variancePct   = 0m;
            var varianceAlert = false;
            decimal? varianceKg = null;

            if (previousWeight.HasValue && previousWeight.Value > 0)
            {
                varianceKg  = Math.Abs(req.ActualWeightKg - previousWeight.Value);
                variancePct = varianceKg.Value / previousWeight.Value;
                varianceAlert = variancePct > VarianceAlertThreshold;
            }

            // Ghi PackageDimension (lịch sử cân)
            var dimension = PackageDimension.Record(
                packageId:      package.Id,
                source:         DimensionSource.ChinaWarehouse,
                actualWeightKg: req.ActualWeightKg,
                measuredBy:     staffId,
                lengthCm:       req.LengthCm,
                widthCm:        req.WidthCm,
                heightCm:       req.HeightCm,
                deviceId:       req.DeviceId,
                varianceKg:     varianceKg
            );
            package.Dimensions.Add(dimension);

            // Chuyển trạng thái → InCnWarehouse
            package.TransitionTo(PackageStatus.InCnWarehouse);

            // Ghi WarehouseReceipt
            var receipt = WarehouseReceipt.Create(package.Id, warehouseId, staffId, req.Condition, req.Note);
            await receiptRepo.AddAsync(receipt, innerCt);

            // Ghi TrackingEvent hiển thị cho khách
            var trackingEvent = TrackingEvent.Record(
                packageId: package.Id,
                type:      TrackingEventType.CnWarehouseIn,
                location:  $"{warehouse.City}, {warehouse.Country}",
                note:      req.Condition == ReceiptCondition.Ok ? null : $"Tình trạng: {req.Condition}"
            );
            await trackingRepo.AddAsync(trackingEvent, innerCt);

            await packageRepo.UpdateAsync(package, innerCt);

            logger.LogInformation("CN receive: {Barcode} at {Warehouse}, weight={Weight}kg, variance={Variance:P1}",
                req.Barcode, warehouse.Name, req.ActualWeightKg, variancePct);

            // Alert nhân viên nếu cân chênh lệch > 10%
            if (varianceAlert)
                await notifyService.SendWeightVarianceAlertAsync(staffId, req.Barcode, variancePct, innerCt);

            return new ReceiveScanResult(
                PackageId:          package.Id,
                Barcode:            package.Barcode,
                Status:             package.Status.ToString(),
                CustomerName:       "(Cần join Auth service)",     // Phase 6: cross-service call
                OrderCode:          package.OrderId.ToString()[..8].ToUpper(),
                ChargedWeightKg:    package.ChargedWeightKg,
                WeightVarianceAlert: varianceAlert,
                VariancePct:        varianceAlert ? variancePct : null,
                Condition:          req.Condition.ToString(),
                ReceivedAt:         receipt.ReceivedAt
            );
        }, ct);
    }

    // ── UC-2.06: Nhập kho VN & rã bao ────────────────────────────────────────
    public async Task<ReceiveScanResult> ReceiveAtVnWarehouseAsync(
        Guid warehouseId, Guid staffId, VnWarehouseReceiveRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var warehouse = await warehouseRepo.GetByIdAsync(warehouseId, innerCt)
                            ?? throw new WarehouseNotFoundException(warehouseId);

            var package = await packageRepo.GetByBarcodeAsync(req.Barcode, innerCt)
                          ?? throw new PackageNotFoundException(req.Barcode);

            // Gán vị trí trong kho
            var zones = await zoneRepo.GetByWarehouseAsync(warehouseId, innerCt);
            var zone  = zones.FirstOrDefault(z => z.Code == req.ZoneCode.ToUpper())
                        ?? throw new InvalidOperationException($"Zone '{req.ZoneCode}' không tồn tại trong kho này.");
            package.AssignZone(zone.Id);

            // Cân đối soát lần 2 (nếu cung cấp)
            var variancePct   = 0m;
            var varianceAlert = false;
            decimal? varianceKg = null;

            if (req.ActualWeightKg.HasValue)
            {
                var previousWeight = package.ActualWeightKg;
                if (previousWeight.HasValue && previousWeight.Value > 0)
                {
                    varianceKg  = Math.Abs(req.ActualWeightKg.Value - previousWeight.Value);
                    variancePct = varianceKg.Value / previousWeight.Value;
                    varianceAlert = variancePct > VarianceAlertThreshold;
                }

                package.RecordMeasurement(req.ActualWeightKg.Value, req.LengthCm, req.WidthCm, req.HeightCm);

                var dimension = PackageDimension.Record(
                    packageId:      package.Id,
                    source:         DimensionSource.VnWarehouse,
                    actualWeightKg: req.ActualWeightKg.Value,
                    measuredBy:     staffId,
                    lengthCm:       req.LengthCm,
                    widthCm:        req.WidthCm,
                    heightCm:       req.HeightCm,
                    deviceId:       req.DeviceId,
                    varianceKg:     varianceKg
                );
                package.Dimensions.Add(dimension);
            }

            // Chuyển trạng thái → InVnWarehouse
            package.TransitionTo(PackageStatus.InVnWarehouse);

            // Ghi WarehouseReceipt
            var receipt = WarehouseReceipt.Create(package.Id, warehouseId, staffId, req.Condition, req.Note);
            await receiptRepo.AddAsync(receipt, innerCt);

            // Ghi TrackingEvent — hiển thị cho khách
            var trackingEvent = TrackingEvent.Record(
                packageId: package.Id,
                type:      TrackingEventType.VnWarehouseIn,
                location:  $"{warehouse.City}, {warehouse.Country}",
                note:      $"Khu vực: {zone.Code}" + (req.Condition == ReceiptCondition.Ok ? "" : $" | Tình trạng: {req.Condition}")
            );
            await trackingRepo.AddAsync(trackingEvent, innerCt);

            await packageRepo.UpdateAsync(package, innerCt);

            logger.LogInformation("VN receive: {Barcode} at {Warehouse} zone {Zone}",
                req.Barcode, warehouse.Name, zone.Code);

            // Push notify cho khách — "Hàng đã về kho VN"
            await notifyService.SendPackageArrivedVnAsync(
                package.CustomerId,
                package.Barcode,
                package.OrderId.ToString()[..8].ToUpper(),
                innerCt
            );

            if (varianceAlert)
                await notifyService.SendWeightVarianceAlertAsync(staffId, req.Barcode, variancePct, innerCt);

            return new ReceiveScanResult(
                PackageId:          package.Id,
                Barcode:            package.Barcode,
                Status:             package.Status.ToString(),
                CustomerName:       "(Cần join Auth service)",
                OrderCode:          package.OrderId.ToString()[..8].ToUpper(),
                ChargedWeightKg:    package.ChargedWeightKg,
                WeightVarianceAlert: varianceAlert,
                VariancePct:        varianceAlert ? variancePct : null,
                Condition:          req.Condition.ToString(),
                ReceivedAt:         receipt.ReceivedAt
            );
        }, ct);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────
    private static WarehouseResponse MapWarehouse(Warehouse w) => new(
        Id:           w.Id,
        Name:         w.Name,
        Type:         w.Type.ToString(),
        Country:      w.Country,
        City:         w.City,
        Address:      w.Address,
        MaxCapacityM3: w.MaxCapacityM3,
        IsActive:     w.IsActive
    );
}
