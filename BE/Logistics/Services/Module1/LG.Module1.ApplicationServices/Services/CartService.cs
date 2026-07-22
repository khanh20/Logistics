using LG.Module1.ApplicationServices.DTOs.Cart;
using LG.Module1.ApplicationServices.Interfaces;
using LG.Module1.Domain.Entities;
using LG.Module1.Domain.Exceptions;
using LG.Module1.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace LG.Module1.ApplicationServices.Services;

/// Quản lý giỏ hàng và checkout.
/// Mỗi customer có tối đa 1 cart Active.
/// Checkout tạo 1 CustomerOrder cho mỗi shop, wrapped trong 1 transaction.
public class CartService(
    ICartRepository                cartRepo,
    ICartItemRepository            cartItemRepo,
    IProductRepository             productRepo,
    IProductVariantRepository      variantRepo,
    IPlatformShopRepository        shopRepo,
    ICustomerOrderRepository       orderRepo,
    IDepositConfigRepository       depositRepo,
    IExchangeRateHistoryRepository rateRepo,
    IWalletService                 walletService,
    IModule1UnitOfWork             uow,
    ILogger<CartService>           logger
) : ICartService
{
    // ── GetOrCreate ───────────────────────────────────────────────────────────

    public async Task<CartResponse> GetOrCreateCartAsync(Guid customerId, CancellationToken ct = default)
    {
        var cart = await cartRepo.GetActiveByCustomerAsync(customerId, ct);
        if (cart is null)
        {
            cart = Cart.CreateForCustomer(customerId);
            await cartRepo.AddAsync(cart, ct);
            await uow.SaveChangesAsync(ct);
        }
        return MapToResponse(cart);
    }

    // ── AddItem ───────────────────────────────────────────────────────────────

    public Task<CartResponse> AddItemAsync(Guid customerId, AddCartItemRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var cart    = await EnsureActiveCartAsync(customerId, innerCt);
            var variant = await variantRepo.GetByIdAsync(req.VariantId, innerCt)
                          ?? throw new ProductNotFoundException(req.VariantId);

            if (!variant.IsAvailable)
                throw new VariantUnavailableException(variant.TranslatedName ?? variant.VariantName);

            // GetByIdWithDetailsAsync → Images + ShopId trong một query
            var product = await productRepo.GetByIdWithDetailsAsync(req.ProductId, innerCt)
                          ?? throw new ProductNotFoundException(req.ProductId);

            if (product.IsForbidden)
                throw new ForbiddenProductException(product.TranslatedTitle ?? product.OriginalTitle, "hàng cấm/hạn chế");

            var primaryImage = product.Images.FirstOrDefault(i => i.IsPrimary)?.LocalCdnUrl
                            ?? product.Images.FirstOrDefault()?.SourceUrl;

            var cartItem = cart.AddOrUpdateItem(
                productId:        product.Id,
                variantId:        variant.Id,
                shopId:           product.ShopId,
                quantity:         req.Quantity,
                priceCnySnapshot: variant.PriceCnyCurrent,
                productTitle:     product.TranslatedTitle ?? product.OriginalTitle,
                variantName:      variant.TranslatedName  ?? variant.VariantName,
                imageUrl:         variant.ImageUrl ?? primaryImage
            );

            await cartItemRepo.AddAsync(cartItem, innerCt);

            await cartRepo.UpdateAsync(cart, innerCt);

            logger.LogInformation("Cart {CartId}: added variant {VariantId} x{Qty}", cart.Id, req.VariantId, req.Quantity);
            return MapToResponse(cart);
        }, ct);
    }

    // ── UpdateItemQuantity ────────────────────────────────────────────────────

    public async Task<CartResponse> UpdateItemQuantityAsync(Guid customerId, Guid cartItemId,
        UpdateCartItemQuantityRequest req, CancellationToken ct = default)
    {
        var cart = await EnsureActiveCartAsync(customerId, ct);
        cart.UpdateItemQuantity(cartItemId, req.Quantity);
        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(cart);
    }

    // ── RemoveItem ────────────────────────────────────────────────────────────

    public async Task<CartResponse> RemoveItemAsync(Guid customerId, Guid cartItemId, CancellationToken ct = default)
    {
        var cart        = await EnsureActiveCartAsync(customerId, ct);
        var removedItem = cart.RemoveItem(cartItemId);  
        await cartItemRepo.DeleteAsync(removedItem, ct); 
        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(cart);
    }

    // ── ClearCart ─────────────────────────────────────────────────────────────

    public async Task<CartResponse> ClearCartAsync(Guid customerId, CancellationToken ct = default)
    {
        var cart         = await EnsureActiveCartAsync(customerId, ct);
        var removedItems = cart.Clear();                        
        await cartItemRepo.DeleteRangeAsync(removedItems, ct);   
        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(cart);
    }

    // ── PreviewCheckout ───────────────────────────────────────────────────────

    public async Task<CheckoutPreviewResponse> PreviewCheckoutAsync(Guid customerId,
        CheckoutPreviewRequest req, CancellationToken ct = default)
    {
        var cart  = await EnsureActiveCartAsync(customerId, ct);
        var items = FilterByShops(cart, req.ShopIds);

        if (!items.Any())
            throw new EmptyCartCheckoutException();

        var (rate, depositCfg) = await LoadRateAndDepositAsync(ct);
        var rateVnd            = rate.RateVndPerCny;

        // Build per-shop preview groups
        var groups = new List<CheckoutPreviewGroupResponse>();
        foreach (var shopGroup in items.GroupBy(i => i.ShopId))
        {
            var shop       = await shopRepo.GetByIdAsync(shopGroup.Key, ct);
            var shopName   = shop?.ShopName ?? shopGroup.Key.ToString();
            var groupItems = shopGroup.ToList();

            var hasForbidden = false;
            var warnings     = new List<string>();

            // Kiểm tra từng sản phẩm có bị cấm không
            foreach (var ci in groupItems)
            {
                var prod = await productRepo.GetByIdAsync(ci.ProductId, ct);
                if (prod?.IsForbidden == true)
                {
                    hasForbidden = true;
                    warnings.Add($"Sản phẩm '{ci.ProductTitleSnapshot}' nằm trong danh mục hàng cấm/hạn chế.");
                }
            }

            if (shop?.IsBlacklisted == true)
                warnings.Add($"Shop '{shopName}' đang bị blacklist.");

            var subtotalCny = groupItems.Sum(ci => ci.Quantity * ci.PriceCnySnapshot);
            var subtotalVnd = Math.Round(subtotalCny * rateVnd, 0);

            groups.Add(new CheckoutPreviewGroupResponse(
                ShopId:               shopGroup.Key,
                ShopName:             shopName,
                SubtotalCny:          subtotalCny,
                SubtotalVnd:          subtotalVnd,
                ItemCount:            groupItems.Count,
                HasForbiddenProducts: hasForbidden,
                Warnings:             warnings
            ));
        }

        var totalSubtotalVnd = groups.Sum(g => g.SubtotalVnd);

        // Gọi Core API để tính toán phí thực tế từ FeeRule
        var feeCalc = await walletService.CalculateCheckoutFeesAsync(customerId, totalSubtotalVnd, req.InsuranceOption, req.ShippingLine, ct);
        var serviceFeeVnd = feeCalc.ServiceFeeVnd;
        var inspectionFeeVnd = feeCalc.InspectionFeeVnd;
        var insuranceFeeVnd = feeCalc.InsuranceFeeVnd;
        var importEntrustmentFeeVnd = feeCalc.ImportEntrustmentFeeVnd;
        var importVatVnd = feeCalc.ImportVatVnd;
        var importDutyVnd = feeCalc.ImportDutyVnd;

        const decimal shippingFeeVnd = 0m; // Phí ship quốc tế ước tính lúc này tạm để 0 (sẽ tính sau khi có cân nặng thực tế)
        
        var totalVnd = totalSubtotalVnd + serviceFeeVnd + inspectionFeeVnd + insuranceFeeVnd + importEntrustmentFeeVnd + importVatVnd + importDutyVnd + shippingFeeVnd;
        var depositVnd = Math.Round(totalVnd * depositCfg.DepositPct, 0);
        var remainingVnd = totalVnd - depositVnd;

        // Lấy số dư ví thực tế để check sufficiency
        var walletBalance = await walletService.GetBalanceAsync(customerId, ct);
        var isSufficient = walletBalance >= depositVnd;
        var shortageVnd = isSufficient ? 0m : depositVnd - walletBalance;

        return new CheckoutPreviewResponse(
            ExchangeRateVndPerCny:   rateVnd,
            RateAsOf:                rate.EffectiveFrom.ToString("O"),
            Groups:                  groups,
            SubtotalVnd:             totalSubtotalVnd,
            ServiceFeeVnd:           serviceFeeVnd,
            InspectionFeeVnd:        inspectionFeeVnd,
            InsuranceFeeVnd:         insuranceFeeVnd,
            ImportEntrustmentFeeVnd: importEntrustmentFeeVnd,
            ImportVatVnd:            importVatVnd,
            ImportDutyVnd:           importDutyVnd,
            EstimatedShippingFeeVnd: shippingFeeVnd,
            TotalVnd:                totalVnd,
            DepositVnd:              depositVnd,
            RemainingPaymentVnd:     remainingVnd,
            WalletBalanceSufficient: isSufficient,
            WalletBalanceVnd:        walletBalance,
            WalletShortageVnd:       shortageVnd,
            ServiceFeeDiscountVnd:   feeCalc.ServiceFeeDiscountVnd,
            InspectionFeeDiscountVnd: feeCalc.InspectionFeeDiscountVnd
        );
    }

    // ── ConfirmCheckout (ATOMIC) ──────────────────────────────────────────────

    public Task<ConfirmCheckoutResponse> ConfirmCheckoutAsync(Guid customerId,
        ConfirmCheckoutRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var cart  = await EnsureActiveCartAsync(customerId, innerCt);
            var items = FilterByShops(cart, req.ShopIds);

            if (!items.Any())
                throw new EmptyCartCheckoutException();

            var (rate, depositCfg) = await LoadRateAndDepositAsync(innerCt);

            // ── 1. Tính tổng subtotalVnd chung cho toàn bộ checkout ──────────────
            var shopGroups = items.GroupBy(i => i.ShopId).ToList();
            var shopSubtotals = new Dictionary<Guid, decimal>();

            foreach (var sg in shopGroups)
            {
                var subtotalCny = sg.Sum(ci => ci.Quantity * ci.PriceCnySnapshot);
                shopSubtotals[sg.Key] = Math.Round(subtotalCny * rate.RateVndPerCny, 0);
            }

            var totalSubtotalVnd = shopSubtotals.Values.Sum();

            // ── 2. Gọi CalculateCheckoutFeesAsync MỘT LẦN DUY NHẤT ──────────────
            var feeCalc = await walletService.CalculateCheckoutFeesAsync(
                customerId, totalSubtotalVnd, req.InsuranceOption, req.ShippingLine, innerCt);

            // ── 3. Phân bổ (prorate) phí cho từng shop theo tỉ trọng ─────────────
            var shopCount = shopGroups.Count;
            var allocatedFees = new Dictionary<Guid, (decimal service, decimal inspection, decimal insurance, 
                                                      decimal importEntrustment, decimal importVat, decimal importDuty)>();
            decimal sumService = 0, sumInspection = 0, sumInsurance = 0, 
                    sumImportEntrustment = 0, sumImportVat = 0, sumImportDuty = 0;

            for (int i = 0; i < shopGroups.Count; i++)
            {
                var shopId = shopGroups[i].Key;
                var shopVnd = shopSubtotals[shopId];

                if (i < shopGroups.Count - 1)
                {
                    // Tính tỉ lệ phí theo tỉ trọng giá trị shop
                    var ratio = totalSubtotalVnd > 0 ? shopVnd / totalSubtotalVnd : 1m / shopCount;
                    var svc  = Math.Round(feeCalc.ServiceFeeVnd * ratio, 0);
                    var insp = Math.Round(feeCalc.InspectionFeeVnd * ratio, 0);
                    var ins  = Math.Round(feeCalc.InsuranceFeeVnd * ratio, 0);
                    var ie   = Math.Round(feeCalc.ImportEntrustmentFeeVnd * ratio, 0);
                    var iv   = Math.Round(feeCalc.ImportVatVnd * ratio, 0);
                    var id   = Math.Round(feeCalc.ImportDutyVnd * ratio, 0);

                    allocatedFees[shopId] = (svc, insp, ins, ie, iv, id);
                    sumService += svc; sumInspection += insp; sumInsurance += ins;
                    sumImportEntrustment += ie; sumImportVat += iv; sumImportDuty += id;
                }
                else
                {
                    // Đơn cuối cùng: gán phần DƯ rounding để tổng khớp chính xác
                    allocatedFees[shopId] = (
                        feeCalc.ServiceFeeVnd - sumService,
                        feeCalc.InspectionFeeVnd - sumInspection,
                        feeCalc.InsuranceFeeVnd - sumInsurance,
                        feeCalc.ImportEntrustmentFeeVnd - sumImportEntrustment,
                        feeCalc.ImportVatVnd - sumImportVat,
                        feeCalc.ImportDutyVnd - sumImportDuty
                    );
                }
            }

            // ── 4. Tạo đơn hàng cho từng shop với phí đã phân bổ ─────────────────
            var createdOrderIds = new List<string>();
            DateTime? firstDeadline = null;

            foreach (var shopGroup in shopGroups)
            {
                var shop = await shopRepo.GetByIdAsync(shopGroup.Key, innerCt)
                           ?? throw new ProductNotFoundException($"Shop {shopGroup.Key}");

                if (shop.IsBlacklisted)
                    throw new BlacklistedShopException(shop.ShopName);

                if (!Enum.TryParse<ShippingLine>(req.ShippingLine, true, out var parsedShippingLine))
                    parsedShippingLine = ShippingLine.Tmdt;

                var order = CustomerOrder.Create(
                    customerId:          customerId,
                    shopId:              shop.Id,
                    shopName:            shop.ShopName,
                    rateVndPerCny:       rate.RateVndPerCny,
                    depositPct:          depositCfg.DepositPct,
                    placementMode:       shop.IntegrationMode == ShopIntegrationMode.ShopifyAuto
                                             ? PlacementMode.AutoApi
                                             : PlacementMode.Manual,
                    shippingLine:        parsedShippingLine,
                    deliveryAddressNote: req.DeliveryAddressNote,
                    customerNote:        req.CustomerNote
                );

                foreach (var ci in shopGroup)
                {
                    var prod = await productRepo.GetByIdAsync(ci.ProductId, innerCt);
                    if (prod?.IsForbidden == true)
                        throw new ForbiddenProductException(ci.ProductTitleSnapshot, "hàng cấm/hạn chế");

                    order.AddItem(
                        variantId:    ci.VariantId,
                        productTitle: ci.ProductTitleSnapshot,
                        variantName:  ci.VariantNameSnapshot,
                        imageUrl:     ci.ImageUrlSnapshot,
                        quantity:     ci.Quantity,
                        unitPriceCny: ci.PriceCnySnapshot
                    );
                }

                var fees = allocatedFees[shopGroup.Key];
                order.CalculateDeposit(fees.service, fees.inspection, fees.insurance,
                                       fees.importEntrustment, fees.importVat, fees.importDuty);

                await orderRepo.AddAsync(order, innerCt);

                createdOrderIds.Add(order.Id.ToString());
                firstDeadline ??= order.PaymentDeadline;

                logger.LogInformation(
                    "CustomerOrder {OrderCode} created for customer {CustomerId}, shop {ShopName}. Fees: svc={Svc}, insp={Insp}, ins={Ins}",
                    order.OrderCode, customerId, shop.ShopName, fees.service, fees.inspection, fees.insurance);
            }

            // Xóa item đã checkout hoặc mark cart Converted nếu checkout toàn bộ
            if (req.ShopIds is null || req.ShopIds.Count == 0)
            {
                // Checkout toàn bộ cart → mark Converted (không cần xóa từng item)
                cart.MarkConverted();
            }
            else
            {
                // Checkout một phần (theo shop) → explicit delete + xóa khỏi collection
                await cartItemRepo.DeleteRangeAsync(items, innerCt);
                foreach (var item in items)
                    cart.RemoveItem(item.Id);
            }

            await cartRepo.UpdateAsync(cart, innerCt);

            return new ConfirmCheckoutResponse(
                CreatedOrderIds:        createdOrderIds,
                TotalChargedFromWallet: 0m,          // stub — wallet Phase 8
                CountdownDeadline:      (firstDeadline ?? DateTime.UtcNow.AddMinutes(30)).ToString("O")
            );
        }, ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<Cart> EnsureActiveCartAsync(Guid customerId, CancellationToken ct)
    {
        var cart = await cartRepo.GetActiveByCustomerAsync(customerId, ct);
        if (cart is null)
        {
            cart = Cart.CreateForCustomer(customerId);
            await cartRepo.AddAsync(cart, ct);
            await uow.SaveChangesAsync(ct);
        }
        return cart;
    }

    /// Lọc items theo ShopIds được chọn từ FE. Null / empty = lấy tất cả.
    private static List<CartItem> FilterByShops(Cart cart, List<Guid>? shopIds)
    {
        if (shopIds is null || shopIds.Count == 0)
            return cart.Items.ToList();
        return cart.Items.Where(i => shopIds.Contains(i.ShopId)).ToList();
    }

    private async Task<(ExchangeRateHistory Rate, DepositConfig Deposit)> LoadRateAndDepositAsync(CancellationToken ct)
    {
        var rate = await rateRepo.GetCurrentAsync(ct)
                   ?? throw new InvalidOperationException("Chưa có tỉ giá. Vui lòng cập nhật tỉ giá trước.");
        var deposit = await depositRepo.GetActiveForCustomerAsync(null, ct)
                      ?? throw new InvalidOperationException("Chưa có cấu hình đặt cọc.");
        return (rate, deposit);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static CartResponse MapToResponse(Cart cart)
    {
        var groups = cart.Items
            .GroupBy(i => i.ShopId)
            .Select(g =>
            {
                var shopName  = g.First().Shop?.ShopName ?? g.Key.ToString();
                var shopItems = g.Select(ci => new CartItemResponse(
                    Id:               ci.Id,
                    ProductId:        ci.ProductId,
                    VariantId:        ci.VariantId,
                    ShopId:           ci.ShopId,
                    ShopName:         shopName,
                    ProductTitle:     ci.ProductTitleSnapshot,
                    VariantName:      ci.VariantNameSnapshot,
                    ImageUrl:         ci.ImageUrlSnapshot,
                    Quantity:         ci.Quantity,
                    PriceCnySnapshot: ci.PriceCnySnapshot,
                    LineTotalCny:     ci.Quantity * ci.PriceCnySnapshot,
                    AddedAt:          ci.AddedAt
                )).ToList();

                return new CartGroupByShopResponse(
                    ShopId:      g.Key,
                    ShopName:    shopName,
                    SubtotalCny: shopItems.Sum(i => i.LineTotalCny),
                    ItemCount:   shopItems.Count,
                    Items:       shopItems
                );
            }).ToList();

        return new CartResponse(
            Id:             cart.Id,
            Status:         cart.Status.ToString(),
            TotalItemCount: cart.Items.Count,
            SubtotalCny:    groups.Sum(g => g.SubtotalCny),
            CreatedAt:      cart.CreatedAt,
            GroupsByShop:   groups
        );
    }
}
