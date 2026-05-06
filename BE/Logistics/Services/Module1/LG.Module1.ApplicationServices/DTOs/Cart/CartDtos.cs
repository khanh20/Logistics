using System.ComponentModel.DataAnnotations;
using LG.Module1.Domain.Entities;

namespace LG.Module1.ApplicationServices.DTOs.Cart;

// ── Responses ─────────────────────────────────────────────────────────────────

public record CartItemResponse(
    Guid    Id,
    Guid    ProductId,
    Guid    VariantId,
    Guid    ShopId,
    string  ProductTitle,
    string? VariantName,
    string? ImageUrl,
    int     Quantity,
    decimal PriceCny,
    decimal TotalCny
);

public record CartGroupByShopResponse(
    Guid                    ShopId,
    string                  ShopName,
    List<CartItemResponse>  Items,
    decimal                 SubtotalCny
);

public record CartResponse(
    Guid                         CartId,
    Guid                         CustomerId,
    CartStatus                   Status,
    List<CartGroupByShopResponse> Groups,
    decimal                      TotalCny,
    DateTime                     UpdatedAt
);

// Preview trước khi checkout — tính toán chi phí theo shop
public record CheckoutPreviewItemResponse(
    Guid    CartItemId,
    Guid    VariantId,
    string  ProductTitle,
    string? VariantName,
    int     Quantity,
    decimal UnitPriceCny,
    decimal SubtotalCny
);

public record CheckoutPreviewGroupResponse(
    Guid                             ShopId,
    string                           ShopName,
    string                           ShopIntegrationMode,
    bool                             ShopIsBlacklisted,
    List<CheckoutPreviewItemResponse> Items,
    decimal                          SubtotalCny,
    decimal                          EstimatedDepositVnd  // = subtotalCny * rateVnd * depositPct
);

public record CheckoutPreviewResponse(
    List<CheckoutPreviewGroupResponse> Groups,
    decimal TotalCny,
    decimal RateVndPerCny,
    decimal DepositPct,
    decimal TotalDepositVnd,
    string  DepositConfigName
);

// Kết quả confirm checkout — mảng order đã tạo (1 order / shop)
public record ConfirmCheckoutItemResponse(
    Guid   OrderId,
    string OrderCode,
    Guid   ShopId,
    string ShopName,
    decimal TotalCny,
    decimal DepositVnd,
    string  Status
);

public record ConfirmCheckoutResponse(
    List<ConfirmCheckoutItemResponse> Orders,
    int    OrdersCreated,
    decimal TotalDepositVnd
);

// ── Requests ──────────────────────────────────────────────────────────────────

public record AddCartItemRequest(
    [Required] Guid    ProductId,
    [Required] Guid    VariantId,
    [Required] Guid    ShopId,
    [Range(1, 9999)] int Quantity
);

public record UpdateCartItemQuantityRequest(
    [Range(1, 9999)] int Quantity
);

public record CheckoutPreviewRequest(
    /// Null = checkout tất cả item trong cart
    List<Guid>? CartItemIds
);

public record ConfirmCheckoutRequest(
    /// Null = checkout tất cả
    List<Guid>? CartItemIds,
    /// Address id hoặc inline address text (Phase 8)
    string? DeliveryAddressNote
);
