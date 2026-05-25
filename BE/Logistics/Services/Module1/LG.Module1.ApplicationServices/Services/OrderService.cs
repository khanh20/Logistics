using LG.Module1.ApplicationServices.DTOs.Order;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Adapters;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

// ── WalletService stub (Phase 8 bên Module 3) ──────────────────────────────────────────────
public class WalletServiceStub : IWalletService
{
    public Task<decimal> GetBalanceAsync(Guid customerId, CancellationToken ct = default)
        => Task.FromResult(decimal.MaxValue);   // Stub: Phase 8 sẽ call Module 3 Finance

    public Task DeductAsync(Guid customerId, decimal amountVnd, string description, CancellationToken ct = default)
        => throw new NotImplementedException("Wallet integration is pending Phase 8.");
}

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

    public async Task<OrderDetailResponse> GetMyOrderDetailAsync(Guid customerId, Guid orderId, CancellationToken ct = default)
    {
        var order = await orderRepo.GetByIdWithDetailsAsync(orderId, ct)
                    ?? throw new OrderNotFoundException(orderId);
        if (order.CustomerId != customerId)
            throw new OrderNotFoundException(orderId);   // không lộ id của người khác
        return MapToDetail(order);
    }

    public async Task<OrderDetailResponse> CancelOrderAsync(Guid customerId, Guid orderId,
        CancelOrderRequest req, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);
            if (order.CustomerId != customerId)
                throw new OrderNotFoundException(orderId);

            order.CancelByCustomer(req.Reason);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} cancelled by customer {CustomerId}", order.OrderCode, customerId);
            return MapToDetail(order);
        }, ct);
    }

    /// Phase 8 stub — sau khi Phase 8 triển khai wallet sẽ thay thế bằng thực tế.
    public async Task<OrderDetailResponse> PayDepositAsync(Guid customerId, Guid orderId, CancellationToken ct = default)
    {
        return await uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await orderRepo.GetByIdWithDetailsAsync(orderId, innerCt)
                        ?? throw new OrderNotFoundException(orderId);
            if (order.CustomerId != customerId)
                throw new OrderNotFoundException(orderId);

            var balance = await walletService.GetBalanceAsync(customerId, innerCt);
            if (balance < order.DepositVnd)
                throw new InsufficientWalletException(order.DepositVnd, balance);

            order.MarkPaid();
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} deposit paid by customer {CustomerId}", order.OrderCode, customerId);
            return MapToDetail(order);
        }, ct);
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
    IPlatformShopRepository         shopRepo,
    ILogisticsService               logisticsService,
    IModule1UnitOfWork              uow,
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
        return CustomerOrderService.MapToDetail(order);
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
            var po    = PlatformOrder.CreateManual(order.Id, staffId, req.PlatformOrderId, req.Note);
            order.MarkOrderedOnPlatform(staffId, req.Note);
            order.AttachPlatformOrder(po);
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
            return CustomerOrderService.MapToDetail(order);
        }, ct);
    }

    public Task<OrderDetailResponse> MarkArrivedChinaAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkArrivedChinaWh(staffId, note), req.Note);

    public Task<OrderDetailResponse> MarkShippingToVNAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkShippingToVN(staffId, note), req.Note);

    public Task<OrderDetailResponse> MarkArrivedVietnamAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkArrivedVietnam(staffId, note), req.Note);

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
        CancelOrderRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.CancelByStaff(staffId, req.Reason), null);

    public Task<OrderDetailResponse> MarkReturnedAsync(Guid orderId, Guid staffId,
        OrderTransitionRequest req, CancellationToken ct = default) =>
        SimpleTransitionAsync(orderId, staffId, ct, (o, note) => o.MarkReturned(staffId, note), req.Note);

    // ── Private helpers ───────────────────────────────────────────────────────

    private Task<OrderDetailResponse> SimpleTransitionAsync(
        Guid orderId, Guid staffId, CancellationToken ct,
        Action<CustomerOrder, string?> transition, string? note)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var order = await RequireOrderAsync(orderId, innerCt);
            transition(order, note);
            await historyRepo.AddAsync(order.History.Last(), innerCt);
            await orderRepo.UpdateAsync(order, innerCt);
            logger.LogInformation("Order {OrderCode} → {Status} by staff {StaffId}",
                order.OrderCode, order.Status, staffId);
            return CustomerOrderService.MapToDetail(order);
        }, ct);
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
