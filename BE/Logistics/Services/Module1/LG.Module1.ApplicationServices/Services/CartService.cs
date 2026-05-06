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
    ICartRepository              cartRepo,
    IProductRepository           productRepo,
    IProductVariantRepository    variantRepo,
    IPlatformShopRepository      shopRepo,
    ICustomerOrderRepository     orderRepo,
    IDepositConfigRepository     depositRepo,
    IExchangeRateHistoryRepository rateRepo,
    IModule1UnitOfWork           uow,
    ILogger<CartService>         logger
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

    public async Task<CartResponse> AddItemAsync(Guid customerId, AddCartItemRequest req, CancellationToken ct = default)
    {
        var cart    = await EnsureActiveCartAsync(customerId, ct);
        var variant = await variantRepo.GetByIdAsync(req.VariantId, ct)
                      ?? throw new ProductNotFoundException(req.VariantId);
        var product = await productRepo.GetByIdAsync(req.ProductId, ct)
                      ?? throw new ProductNotFoundException(req.ProductId);

        if (!variant.IsAvailable)
            throw new VariantUnavailableException(variant.TranslatedName ?? variant.VariantName);

        // Lấy ảnh từ variant trước, fallback sang ảnh chính của product
        var productWithImages = await productRepo.GetByIdWithDetailsAsync(product.Id, ct);
        var primaryImage = productWithImages?.Images.FirstOrDefault(i => i.IsPrimary)?.LocalCdnUrl
                        ?? productWithImages?.Images.FirstOrDefault()?.SourceUrl;

        cart.AddOrUpdateItem(
            productId:           product.Id,
            variantId:           variant.Id,
            shopId:              req.ShopId,
            quantity:            req.Quantity,
            priceCnySnapshot:    variant.PriceCnyCurrent,
            productTitle:        product.TranslatedTitle ?? product.OriginalTitle,
            variantName:         variant.TranslatedName  ?? variant.VariantName,
            imageUrl:            variant.ImageUrl ?? primaryImage
        );

        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        logger.LogInformation("Cart {CartId}: added variant {VariantId} x{Qty}", cart.Id, req.VariantId, req.Quantity);
        return MapToResponse(cart);
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
        var cart = await EnsureActiveCartAsync(customerId, ct);
        cart.RemoveItem(cartItemId);
        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(cart);
    }

    // ── ClearCart ─────────────────────────────────────────────────────────────

    public async Task<CartResponse> ClearCartAsync(Guid customerId, CancellationToken ct = default)
    {
        var cart = await EnsureActiveCartAsync(customerId, ct);
        cart.Clear();
        await cartRepo.UpdateAsync(cart, ct);
        await uow.SaveChangesAsync(ct);
        return MapToResponse(cart);
    }

    // ── PreviewCheckout ───────────────────────────────────────────────────────

    public async Task<CheckoutPreviewResponse> PreviewCheckoutAsync(Guid customerId,
        CheckoutPreviewRequest req, CancellationToken ct = default)
    {
        var cart    = await EnsureActiveCartAsync(customerId, ct);
        var items   = FilterItems(cart, req.CartItemIds);

        if (!items.Any())
            throw new EmptyCartCheckoutException();

        var (rate, depositCfg) = await LoadRateAndDepositAsync(ct);

        var groups = await BuildPreviewGroupsAsync(items, rate.RateVndPerCny, depositCfg.DepositPct, ct);
        var totalCny = groups.Sum(g => g.SubtotalCny);
        var totalDeposit = groups.Sum(g => g.EstimatedDepositVnd);

        return new CheckoutPreviewResponse(
            Groups:          groups,
            TotalCny:        totalCny,
            RateVndPerCny:   rate.RateVndPerCny,
            DepositPct:      depositCfg.DepositPct,
            TotalDepositVnd: totalDeposit,
            DepositConfigName: depositCfg.Name
        );
    }

    // ── ConfirmCheckout (ATOMIC) ──────────────────────────────────────────────

    public Task<ConfirmCheckoutResponse> ConfirmCheckoutAsync(Guid customerId,
        ConfirmCheckoutRequest req, CancellationToken ct = default)
    {
        return uow.ExecuteInTransactionAsync(async innerCt =>
        {
            var cart  = await EnsureActiveCartAsync(customerId, innerCt);
            var items = FilterItems(cart, req.CartItemIds);

            if (!items.Any())
                throw new EmptyCartCheckoutException();

            var (rate, depositCfg) = await LoadRateAndDepositAsync(innerCt);

            // Group by shop
            var byShop = items.GroupBy(i => i.ShopId);
            var createdOrders = new List<ConfirmCheckoutItemResponse>();

            foreach (var shopGroup in byShop)
            {
                var shop = await shopRepo.GetByIdAsync(shopGroup.Key, innerCt)
                           ?? throw new ProductNotFoundException($"Shop {shopGroup.Key}");

                if (shop.IsBlacklisted)
                    throw new BlacklistedShopException(shop.ShopName);

                // Tạo CustomerOrder
                var order = CustomerOrder.Create(
                    customerId:          customerId,
                    shopId:              shop.Id,
                    shopName:            shop.ShopName,
                    rateVndPerCny:       rate.RateVndPerCny,
                    depositPct:          depositCfg.DepositPct,
                    placementMode:       shop.IntegrationMode == ShopIntegrationMode.ShopifyAuto
                                             ? PlacementMode.AutoApi
                                             : PlacementMode.Manual,
                    deliveryAddressNote: req.DeliveryAddressNote,
                    customerNote:        null
                );

                foreach (var ci in shopGroup)
                {
                    order.AddItem(
                        variantId:    ci.VariantId,
                        productTitle: ci.ProductTitleSnapshot,
                        variantName:  ci.VariantNameSnapshot,
                        imageUrl:     ci.ImageUrlSnapshot,
                        quantity:     ci.Quantity,
                        unitPriceCny: ci.PriceCnySnapshot
                    );
                }

                order.CalculateDeposit();  // tính FinalAmountVnd + DepositVnd từ TotalCny

                await orderRepo.AddAsync(order, innerCt);

                createdOrders.Add(new ConfirmCheckoutItemResponse(
                    OrderId:    order.Id,
                    OrderCode:  order.OrderCode,
                    ShopId:     shop.Id,
                    ShopName:   shop.ShopName,
                    TotalCny:   order.TotalCny,
                    DepositVnd: order.DepositVnd,
                    Status:     order.Status.ToString()
                ));

                logger.LogInformation(
                    "CustomerOrder {OrderCode} created for customer {CustomerId}, shop {ShopName}",
                    order.OrderCode, customerId, shop.ShopName);
            }

            // Xóa các item đã checkout khỏi cart (hoặc mark cart Converted nếu checkout tất cả)
            if (req.CartItemIds is null || req.CartItemIds.Count == 0)
            {
                // checkout toàn bộ → mark cart converted
                cart.MarkConverted();
            }
            else
            {
                // checkout 1 phần → chỉ xóa những item được chọn
                foreach (var id in req.CartItemIds)
                    cart.RemoveItem(id);
            }

            await cartRepo.UpdateAsync(cart, innerCt);

            return new ConfirmCheckoutResponse(
                Orders:         createdOrders,
                OrdersCreated:  createdOrders.Count,
                TotalDepositVnd: createdOrders.Sum(o => o.DepositVnd)
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

    private static List<CartItem> FilterItems(Cart cart, List<Guid>? cartItemIds)
    {
        if (cartItemIds is null || cartItemIds.Count == 0)
            return cart.Items.ToList();
        return cart.Items.Where(i => cartItemIds.Contains(i.Id)).ToList();
    }

    private async Task<(ExchangeRateHistory Rate, DepositConfig Deposit)> LoadRateAndDepositAsync(CancellationToken ct)
    {
        var rate = await rateRepo.GetCurrentAsync(ct)
                   ?? throw new InvalidOperationException("Chưa có tỉ giá. Vui lòng cập nhật tỉ giá trước.");
        var deposit = await depositRepo.GetActiveForCustomerAsync(null, ct)
                      ?? throw new InvalidOperationException("Chưa có cấu hình đặt cọc.");
        return (rate, deposit);
    }

    private async Task<List<CheckoutPreviewGroupResponse>> BuildPreviewGroupsAsync(
        List<CartItem> items, decimal rateVnd, decimal depositPct, CancellationToken ct)
    {
        var result = new List<CheckoutPreviewGroupResponse>();

        foreach (var shopGroup in items.GroupBy(i => i.ShopId))
        {
            var shop = await shopRepo.GetByIdAsync(shopGroup.Key, ct);
            var shopName = shop?.ShopName ?? shopGroup.Key.ToString();
            var mode = shop?.IntegrationMode.ToString() ?? "Manual";
            var isBlacklisted = shop?.IsBlacklisted ?? false;

            var previewItems = shopGroup.Select(ci => new CheckoutPreviewItemResponse(
                CartItemId:   ci.Id,
                VariantId:    ci.VariantId,
                ProductTitle: ci.ProductTitleSnapshot,
                VariantName:  ci.VariantNameSnapshot,
                Quantity:     ci.Quantity,
                UnitPriceCny: ci.PriceCnySnapshot,
                SubtotalCny:  ci.Quantity * ci.PriceCnySnapshot
            )).ToList();

            var subtotal = previewItems.Sum(i => i.SubtotalCny);
            var depositVnd = Math.Round(subtotal * rateVnd * depositPct, 0);

            result.Add(new CheckoutPreviewGroupResponse(
                ShopId:             shopGroup.Key,
                ShopName:           shopName,
                ShopIntegrationMode: mode,
                ShopIsBlacklisted:  isBlacklisted,
                Items:              previewItems,
                SubtotalCny:        subtotal,
                EstimatedDepositVnd: depositVnd
            ));
        }

        return result;
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static CartResponse MapToResponse(Cart cart)
    {
        var groups = cart.Items
            .GroupBy(i => i.ShopId)
            .Select(g =>
            {
                var shopItems = g.Select(ci => new CartItemResponse(
                    Id:           ci.Id,
                    ProductId:    ci.ProductId,
                    VariantId:    ci.VariantId,
                    ShopId:       ci.ShopId,
                    ProductTitle: ci.ProductTitleSnapshot,
                    VariantName:  ci.VariantNameSnapshot,
                    ImageUrl:     ci.ImageUrlSnapshot,
                    Quantity:     ci.Quantity,
                    PriceCny:     ci.PriceCnySnapshot,
                    TotalCny:     ci.Quantity * ci.PriceCnySnapshot
                )).ToList();

                return new CartGroupByShopResponse(
                    ShopId:       g.Key,
                    ShopName:     g.First().Shop?.ShopName ?? g.Key.ToString(),
                    Items:        shopItems,
                    SubtotalCny:  shopItems.Sum(i => i.TotalCny)
                );
            }).ToList();

        return new CartResponse(
            CartId:     cart.Id,
            CustomerId: cart.CustomerId,
            Status:     cart.Status,
            Groups:     groups,
            TotalCny:   groups.Sum(g => g.SubtotalCny),
            UpdatedAt:  cart.UpdatedAt
        );
    }
}
