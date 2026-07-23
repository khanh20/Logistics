using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;



// ── CustomerOrderService ──────────────────────────────────────────────────────
///  Customer-facing order operations.
public class CustomerOrderService(
    ICustomerOrderRepository      orderRepo,
    IOrderStatusHistoryRepository historyRepo,
    IWalletService                walletService,
    IModule1UnitOfWork            uow,
    ILogger<CustomerOrderService> logger
) : ICustomerOrderService
{
    public async Task<(List<OrderListItemResponse> Items, int TotalCount)> GetMyOrdersAsync(
        Guid customerId, OrderStatus? status, int page, int pageSize, CancellationToken ct = default)
    {
        var (items, total) = await orderRepo.SearchAsync(
            customerId, null, status, null, null, page, pageSize, ct);
        return (items.Select(MapToListItem).ToList(), total);
    }

    internal static async Task SyncStorageFeeIfNeededAsync(
        CustomerOrder order, 
        IWalletService walletService, 
        ICustomerOrderRepository orderRepo, 
        IModule1UnitOfWork uow, 
        CancellationToken ct)
    {
        if (order.Status == OrderStatus.ArrivedVietnam)
        {
            var arrivedHistory = order.History.FirstOrDefault(h => h.ToStatus == OrderStatus.ArrivedVietnam);
            if (arrivedHistory != null)
            {
                var arrivedAt = arrivedHistory.ChangedAt;
                var totalStorageDays = Math.Max(0, (DateTime.UtcNow.Date - arrivedAt.Date).Days);
                
                // Chỉ tính toán lại nếu ngày hiện tại khác với ngày cập nhật cuối của Order
                if (order.UpdatedAt.Date < DateTime.UtcNow.Date)
                {
                    var shippingFeeCalc = await walletService.CalculateShippingFeesAsync(
                        order.CustomerId, order.ActualWeightKg ?? 0m, order.VolumeCm3, totalStorageDays, ct);
                    
                    order.UpdateShippingInfo(
                        order.ActualWeightKg ?? 0m, 
                        order.VolumeCm3, 
                        shippingFeeCalc.StorageDaysOverFree, 
                        shippingFeeCalc.ShippingIntlFeeVnd,
                        shippingFeeCalc.StorageFeeVnd,
                        shippingFeeCalc.ChargeableWeightKg);
                        
                    await orderRepo.UpdateAsync(order, ct);
                    await uow.SaveChangesAsync(ct);
                }
            }
        }
    }

    public async Task<OrderDetailResponse> GetMyOrderDetailAsync(Guid customerId, Guid orderId, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new OrderNotFoundException(orderId);   // không lộ id của người khác

        await SyncStorageFeeIfNeededAsync(order, walletService, orderRepo, uow, ct);

        return MapToDetail(order);
    }

    public async Task<OrderDetailResponse> CancelOrderAsync(Guid customerId, Guid orderId,
        CancelOrderRequest req, CancellationToken ct = default)
    {
        var (order, wasPaid, depositVnd) = await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var orderTx = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);
            if (orderTx.CustomerId != customerId)
                throw new OrderNotFoundException(orderId);

            var paid = orderTx.IsDepositPaid;
            var amt = orderTx.DepositVnd;

            orderTx.CancelByCustomer(req.Reason);
            await historyRepo.AddAsync(orderTx.History.Last(), innerCt);
            await orderRepo.UpdateAsync(orderTx, innerCt);
            return (orderTx, paid, amt);
        }, ct);

        logger.LogInformation("Order {OrderCode} cancelled by customer {CustomerId}. WasPaid: {WasPaid}", order.OrderCode, customerId, wasPaid);

        if (wasPaid && depositVnd > 0)
        {
            try
            {
                await walletService.ReleaseFundsByOrderAsync(orderId, "OrderCancelled", ct);
            }
            catch (Exception ex)
            {
                logger.LogCritical(ex, "CRITICAL: Lỗi giải phóng tiền cọc đóng băng cho khách {CustomerId} sau khi hủy đơn {OrderId} (Số tiền: {Amount})", 
                    customerId, orderId, depositVnd);
            }
        }

        return MapToDetail(order);
    }

    public async Task<OrderDetailResponse> PayDepositAsync(Guid customerId, Guid orderId, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new OrderNotFoundException(orderId);

        if (order.Status != OrderStatus.PendingPayment)
            throw new Exception("Đơn hàng không ở trạng thái chờ thanh toán đặt cọc.");

        // 1. Đóng băng tiền cọc (thay vì trừ trực tiếp)
        await walletService.LockFundsAsync(customerId, order.Id, order.DepositVnd, ct);

        try
        {
            return await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                var orderTx = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                            ?? throw new OrderNotFoundException(orderId);
                
                orderTx.MarkPaid();
                await historyRepo.AddAsync(orderTx.History.Last(), innerCt);
                await orderRepo.UpdateAsync(orderTx, innerCt);
                logger.LogInformation("Order {OrderCode} deposit paid by customer {CustomerId}", orderTx.OrderCode, customerId);
                return MapToDetail(orderTx);
            }, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Thanh toán cọc cho đơn {OrderId} thất bại ở Module1. Đang tiến hành hoàn tiền...", orderId);
            try
            {
                await walletService.ReleaseFundsByOrderAsync(orderId, "OrderCancelled", ct);
            }
            catch (Exception refundEx)
            {
                logger.LogCritical(refundEx, "CRITICAL: Giải phóng cọc đóng băng thất bại cho đơn {OrderId} sau khi lỗi ghi nhận database!", orderId);
            }
            throw;
        }
    }

    public async Task<OrderDetailResponse> PayFinalAsync(Guid customerId, Guid orderId, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new OrderNotFoundException(orderId);

        if (order.Status != OrderStatus.ArrivedVietnam)
            throw new Exception("Đơn hàng phải ở trạng thái đã về kho VN mới có thể thanh toán cuối kỳ.");

        if (order.IsFinalPaid)
            throw new Exception("Đơn hàng đã thanh toán cuối kỳ.");

        // Đồng bộ phí lưu kho thực tế tới thời điểm hiện tại trước khi trừ ví thanh toán cuối kỳ
        var arrivedHistory = order.History.FirstOrDefault(h => h.ToStatus == OrderStatus.ArrivedVietnam);
        if (arrivedHistory != null)
        {
            var arrivedAt = arrivedHistory.ChangedAt;
            var totalStorageDays = Math.Max(0, (DateTime.UtcNow.Date - arrivedAt.Date).Days);
            var shippingFeeCalc = await walletService.CalculateShippingFeesAsync(
                order.CustomerId, order.ActualWeightKg ?? 0m, order.VolumeCm3, totalStorageDays, ct);
            
            order.UpdateShippingInfo(
                order.ActualWeightKg ?? 0m, 
                order.VolumeCm3, 
                shippingFeeCalc.StorageDaysOverFree, 
                shippingFeeCalc.ShippingIntlFeeVnd,
                shippingFeeCalc.StorageFeeVnd,
                shippingFeeCalc.ChargeableWeightKg);
                
            await orderRepo.UpdateAsync(order, ct);
            await uow.SaveChangesAsync(ct);
        }

        var remainingAmount = order.FinalAmountVnd - order.DepositVnd;

        // Giải phóng tiền cọc đã đóng băng (OrderCompleted) để tính vào doanh thu chi tiêu
        await walletService.ReleaseFundsByOrderAsync(order.Id, "OrderCompleted", ct);

        if (remainingAmount > 0)
        {
            // 1. Trừ tiền ví thực tế cho phần còn thiếu
            await walletService.DeductAsync(customerId, remainingAmount, "OrderFinalPayment", order.Id, $"Thanh toán phần còn lại đơn hàng {order.OrderCode}", ct);
        }

        try
        {
            return await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                var orderTx = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                            ?? throw new OrderNotFoundException(orderId);
                
                orderTx.MarkFinalPaid();
                await historyRepo.AddAsync(orderTx.History.Last(), innerCt);
                await orderRepo.UpdateAsync(orderTx, innerCt);
                logger.LogInformation("Order {OrderCode} final payment paid by customer {CustomerId}", orderTx.OrderCode, customerId);
                return MapToDetail(orderTx);
            }, ct);
        }
        catch (Exception ex)
        {
            if (remainingAmount > 0)
            {
                logger.LogError(ex, "Thanh toán cuối kỳ cho đơn {OrderId} thất bại ở Module1. Đang tiến hành hoàn tiền...", orderId);
                try
                {
                    await walletService.RefundAsync(customerId, remainingAmount, "OrderFinalRefund", order.Id, $"Hoàn tiền thanh toán cuối kỳ lỗi hệ thống đơn {order.OrderCode}", ct);
                }
                catch (Exception refundEx)
                {
                    logger.LogCritical(refundEx, "CRITICAL: Hoàn tiền thanh toán cuối kỳ thất bại cho đơn {OrderId} sau khi lỗi ghi nhận database!", orderId);
                }
            }
            throw;
        }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    internal static OrderListItemResponse MapToListItem(CustomerOrder o) => new(
        Id:           o.Id,
        OrderCode:    o.OrderCode,
        Status:       o.Status,
        StatusLabel:  o.Status.ToString(),
        ShopId:       o.ShopId,
        ShopName:     o.ShopName,
        ItemCount:    o.Items.Count,
        TotalCny:     o.TotalCny,
        DepositVnd:   o.DepositVnd,
        RateVndPerCny: o.RateVndPerCny,
        CreatedAt:    o.CreatedAt,
        ThumbnailUrl: o.Items.FirstOrDefault()?.ImageUrl
    );

    internal static OrderDetailResponse MapToDetail(CustomerOrder o) => new(
        Id:                 o.Id,
        OrderCode:          o.OrderCode,
        Status:             o.Status,
        StatusLabel:        o.Status.ToString(),
        CustomerId:         o.CustomerId,
        AssignedStaffId:    o.AssignedStaffId,
        ShopId:             o.ShopId,
        ShopName:           o.ShopName,
        PlacementMode:      o.PlacementMode.ToString(),
        TotalCny:           o.TotalCny,
        DepositPct:         o.DepositPct,
        DepositVnd:         o.DepositVnd,
        FinalAmountVnd:     o.FinalAmountVnd,
        RateVndPerCny:      o.RateVndPerCny,
        IsDepositPaid:      o.IsDepositPaid,
        IsFinalPaid:        o.IsFinalPaid,
        ActualWeightKg:     o.ActualWeightKg,
        VolumeCm3:          o.VolumeCm3,
        StorageDaysOverFree: o.StorageDaysOverFree,
        ShippingFeeVnd:      o.ShippingFeeVnd,
        DeliveryAddressNote: o.DeliveryAddressNote,
        CustomerNote:       o.CustomerNote,
        StaffNote:          o.StaffNote,
        CreatedAt:          o.CreatedAt,
        PaidAt:             o.PaidAt,
        CompletedAt:        o.CompletedAt,
        CancelledAt:        o.CancelledAt,
        CancelReason:       o.CancelReason,
        Items: o.Items.Select(i => new OrderItemResponse(
            Id:           i.Id,
            VariantId:    i.VariantId,
            ProductTitle: i.ProductTitleSnapshot,
            VariantName:  i.VariantNameSnapshot,
            ImageUrl:     i.ImageUrl,
            Quantity:     i.Quantity,
            UnitPriceCny: i.UnitPriceCny,
            TotalCny:     i.TotalCny
        )).ToList(),
        History: o.History.OrderByDescending(h => h.ChangedAt).Select(h => new OrderStatusHistoryResponse(
            FromStatus: h.FromStatus,
            ToStatus:   h.ToStatus,
            Note:       h.Note,
            ChangedBy:  h.ChangedBy,
            ChangedAt:  h.ChangedAt
        )).ToList(),
        PlatformOrder: o.PlatformOrder == null ? null : new PlatformOrderResponse(
            Id:              o.PlatformOrder.Id,
            CustomerOrderId: o.PlatformOrder.CustomerOrderId,
            PlatformOrderId: o.PlatformOrder.PlatformOrderId,
            TrackingNumber:  o.PlatformOrder.TrackingNumber,
            TrackingCarrier: o.PlatformOrder.TrackingCarrier,
            IssueNote:       o.PlatformOrder.IssueNote,
            HasIssue:        o.PlatformOrder.HasIssue,
            CreatedAt:       o.PlatformOrder.CreatedAt,
            UpdatedAt:       o.PlatformOrder.UpdatedAt
        ),
        Fees: o.Fees.Select(f => new OrderFeeDetailResponse(
            FeeType:   f.FeeType,
            AmountVnd: f.AmountVnd,
            Note:      f.Note
        )).ToList()
    );
}

// ── OrderManagementService (Staff / Admin) ────────────────────────────────────
/// Staff / Admin order management. All state transitions go through here.
public class OrderManagementService(
    ICustomerOrderRepository        orderRepo,
    IOrderStatusHistoryRepository   historyRepo,
    IPlatformOrderRepository        platformOrderRepo,
    IPlatformShopRepository         shopRepo,
    ILogisticsService               logisticsService,
    IModule1UnitOfWork              uow,
    IWalletService                  walletService,
    IInternalAuthClient             authClient,
    ILogger<OrderManagementService> logger
) : IOrderManagementService
{
    public async Task<(List<StaffOrderListItemResponse> Items, int TotalCount)> GetOrdersAsync(
        OrderListFilter filter, CancellationToken ct = default)
    {
        var (items, total) = await orderRepo.SearchAsync(
            filter.CustomerId, filter.StaffId, filter.Status,
            filter.FromDate, filter.ToDate,
            filter.Page, filter.PageSize, ct);
        return (items.Select(MapToStaffListItem).ToList(), total);
    }

    public async Task<OrderDetailResponse> GetOrderDetailAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        
        await CustomerOrderService.SyncStorageFeeIfNeededAsync(order, walletService, orderRepo, uow, ct);

        return CustomerOrderService.MapToDetail(order);
    }

    public async Task<OrderDetailResponse> GetOrderDetailByCodeAsync(string orderCode, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByOrderCodeAsync(orderCode, ct)
                    ?? throw new OrderNotFoundException(Guid.Empty); // Hoặc bạn có thể tạo custom exception cho OrderCode
        
        return await GetOrderDetailAsync(order.Id, ct);
    }

    public Task<OrderDetailResponse> AssignOrderAsync(Guid orderId, Guid staffId, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            var shop  = await shopRepo.GetByIdAsync(order.ShopId, innerCt);
            var mode  = shop?.IntegrationMode == ShopIntegrationMode.ShopifyAuto
                        ? ShopIntegrationMode.ShopifyAuto
                        : ShopIntegrationMode.Manual;
            order.AssignToStaff(staffId, mode);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} assigned to staff {StaffId}", order.OrderCode, staffId);
            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> RecordManualPlacementAsync(Guid orderId, Guid staffId,
        ManualPlacementRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            var po    = PlatformOrder.CreateManual(order.Id, staffId, req.PlatformOrderId, notes: req.Note);
            order.MarkOrderedOnPlatform(staffId, req.Note);
            order.AttachPlatformOrder(po);
            await platformOrderRepo.AddAsync(po, innerCt);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} manually placed on platform by staff {StaffId}", order.OrderCode, staffId);

            // Thông báo Module 2 tạo shipment (stub Phase 9 — không throw nếu lỗi)
            try
            {
                var shipCode = await logisticsService.CreateShipmentAsync(order.Id, req.PlatformOrderId, innerCt);
                logger.LogInformation("Logistics shipment created: {ShipCode} for order {OrderCode}", shipCode, order.OrderCode);
            }
            catch (Exception ex)
            {
                // Không fail transaction — logistics là best-effort ở Phase 9
                logger.LogWarning(ex, "Logistics stub failed for order {OrderCode} (non-fatal)", order.OrderCode);
            }

            await NotifyStatusChangeAsync(order, innerCt);

            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> UpdateTrackingAsync(Guid orderId, Guid staffId,
        UpdateTrackingRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            order.PlatformOrder?.UpdateTracking(req.TrackingNumber, req.Carrier);
            order.MarkShippedFromShop(staffId, $"Tracking: {req.TrackingNumber} ({req.Carrier})");
            if (req.Note is not null) order.UpdateStaffNote(req.Note);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            
            await NotifyStatusChangeAsync(order, innerCt);

            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> MarkArrivedChinaAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkArrivedChinaWh(staffId, note), req.Note);

    public Task<OrderDetailResponse> MarkShippingToVNAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkShippingToVN(staffId, note), req.Note);

    public async Task<OrderDetailResponse> MarkArrivedVietnamAsync(Guid orderId, Guid staffId,
        ArrivedVietnamRequest req, CancellationToken ct = default)
    {
        try
        {
            return await uow.ExecuteInTransactionAsync(async innerCt =>
            {
                var order = await RequireOrderAsync(orderId, innerCt);
                
                var shippingFeeCalc = await walletService.CalculateShippingFeesAsync(
                    order.CustomerId, req.ActualWeightKg, req.VolumeCm3, req.StorageDaysOverFree, innerCt);

                order.UpdateShippingInfo(req.ActualWeightKg, req.VolumeCm3, shippingFeeCalc.StorageDaysOverFree, 
                                         shippingFeeCalc.ShippingIntlFeeVnd, shippingFeeCalc.StorageFeeVnd, shippingFeeCalc.ChargeableWeightKg);
                order.MarkArrivedVietnam(staffId, req.Note);

                await historyRepo.AddAsync(order.History.Last(), innerCt);
                await orderRepo.UpdateAsync(order, innerCt);

                logger.LogInformation("Order {OrderCode} marked ArrivedVietnam by staff {StaffId}. Shipping Fee: {ShippingFee}", 
                    order.OrderCode, staffId, shippingFeeCalc.TotalShippingFeeVnd);

                await NotifyStatusChangeAsync(order, innerCt);

                return CustomerOrderService.MapToDetail(order);
            }, ct);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            var entityNames = string.Join(", ", ex.Entries.Select(e => $"{e.Entity.GetType().Name} (State: {e.State})"));
            throw new Exception($"Concurrency error on entities: {entityNames}. Exception: {ex.Message}");
        }
    }

    public Task<OrderDetailResponse> MarkDeliveringAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkDelivering(staffId, note), req.Note);

    public Task<OrderDetailResponse> MarkCompletedAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkCompleted(staffId, note), req.Note);

    public Task<OrderDetailResponse> RecordIssueAsync(Guid orderId, Guid staffId,
        RecordIssueRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            order.PlatformOrder?.RecordIssue(req.IssueNote);
            await orderRepo.UpdateAsync(order, innerCt);
            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> CancelByStaffAsync(Guid orderId, Guid staffId,
        CancelOrderRequest req, CancellationToken ct = default)
    {
        // Giải phóng tiền cọc nếu có
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            var wasPaid = order.IsDepositPaid;

            order.CancelByStaff(staffId, req.Reason);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            
            logger.LogInformation("Order {OrderCode} cancelled by staff {StaffId}", order.OrderCode, staffId);

            if (wasPaid && order.DepositVnd > 0)
            {
                try
                {
                    await walletService.ReleaseFundsByOrderAsync(order.Id, "OrderCancelled", innerCt);
                }
                catch (Exception ex)
                {
                    logger.LogCritical(ex, "CRITICAL: Lỗi giải phóng tiền cọc đóng băng cho đơn {OrderId} khi Staff hủy đơn", orderId);
                }
            }

            await NotifyStatusChangeAsync(order, innerCt);

            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> MarkReturnedAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkReturned(staffId, note), req.Note);

    public async Task<decimal> GetDailyPlatformCostAsync(Guid accountId, DateOnly date, CancellationToken ct = default)
    {
        return await platformOrderRepo.GetDailyPlatformCostAsync(accountId, date, ct);
    }

    public async Task<DailyRevenueSummaryDto> GetDailyRevenueSummaryAsync(DateOnly date, CancellationToken ct = default)
    {
        var result = await orderRepo.GetDailyRevenueSummaryAsync(date, ct);
        return new DailyRevenueSummaryDto(
            TotalOrders: result.TotalOrders,
            ServiceFeeVnd: result.ServiceFee,
            ShippingFeeVnd: result.ShippingFee,
            InspectionFeeVnd: result.InspectionFee,
            InsuranceFeeVnd: result.InsuranceFee,
            ImportEntrustmentFeeVnd: result.EntrustmentFee,
            ImportVatVnd: result.VatFee,
            ImportDutyVnd: result.DutyFee
        );
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Task<OrderDetailResponse> SimpleTransitionAsync(
        Guid orderId, Guid staffId, CancellationToken ct,
        Action<CustomerOrder, string?> transition, string? note)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            var oldStatus = order.Status;
            transition(order, note);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} → {Status} by staff {StaffId}",
                order.OrderCode, order.Status, staffId);
            
            if (oldStatus != order.Status)
            {
                await NotifyStatusChangeAsync(order, innerCt);
            }

            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    private async Task NotifyStatusChangeAsync(CustomerOrder order, CancellationToken ct)
    {
        try
        {
            await authClient.SendCustomerNotificationAsync(new SendNotificationRequest(
                UserId: order.CustomerId,
                Title: "Cập nhật đơn hàng",
                Content: $"Đơn hàng {order.OrderCode} đã chuyển sang trạng thái: {order.Status}",
                Type: "System",
                ReferenceType: "Order",
                ReferenceId: order.Id
            ), ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Lỗi gửi thông báo cho khách hàng khi chuyển trạng thái đơn hàng {OrderCode}", order.OrderCode);
        }
    }

    private async Task<CustomerOrder> RequireOrderAsync(Guid orderId, CancellationToken ct)
    {
        return await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
               ?? throw new OrderNotFoundException(orderId);
    }

    private static StaffOrderListItemResponse MapToStaffListItem(CustomerOrder o) => new(
        Id:              o.Id,
        OrderCode:       o.OrderCode,
        Status:          o.Status,
        StatusLabel:     o.Status.ToString(),
        CustomerId:      o.CustomerId,
        CustomerEmail:   null,   // Phase 8: cross-service lookup
        AssignedStaffId: o.AssignedStaffId,
        ShopId:          o.ShopId,
        ShopName:        o.ShopName,
        PlacementMode:   o.PlacementMode.ToString(),
        TotalCny:        o.TotalCny,
        DepositVnd:      o.DepositVnd,
        CreatedAt:       o.CreatedAt
    );
}
