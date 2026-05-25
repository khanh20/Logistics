using System.ComponentModel.DataAnnotations;

namespace LG.Module1.ApplicationServices.DTOs.Cart;

// ── Cart display (aligned with FE types) ─────────────────────────────────────

public record CartItemResponse(
    Guid     Id,
    Guid     ProductId,
    Guid     VariantId,
    Guid     ShopId,
    string   ShopName,
    string   ProductTitle,
    string?  VariantName,
    string?  ImageUrl,
    int      Quantity,
    decimal  PriceCnySnapshot,
    decimal  LineTotalCny,
    DateTime AddedAt
);

public record CartGroupByShopResponse(
    Guid                   ShopId,
    string                 ShopName,
    decimal                SubtotalCny,
    int                    ItemCount,
    List<CartItemResponse> Items
);

public record CartResponse(
    Guid                          Id,
    string                        Status,
    int                           TotalItemCount,
    decimal                       SubtotalCny,
    DateTime                      CreatedAt,
    List<CartGroupByShopResponse> GroupsByShop
);

// ── Checkout preview ──────────────────────────────────────────────────────────

public record CheckoutPreviewGroupResponse(
    Guid    ShopId,
    string  ShopName,
    decimal SubtotalCny,
    decimal SubtotalVnd,
    int     ItemCount,
    bool    HasForbiddenProducts,
    List<string> Warnings
);

/// Response aligned with FE CheckoutPreviewResponse interface.
/// serviceFeeVnd / estimatedShippingFeeVnd are stubs (Phase 8).
/// walletBalance fields are stubs — wallet returns 0 until Phase 8.
public record CheckoutPreviewResponse(
    decimal                          ExchangeRateVndPerCny,
    string                           RateAsOf,              // ISO-8601 string
    List<CheckoutPreviewGroupResponse> Groups,
    decimal                          SubtotalVnd,
    decimal                          ServiceFeeVnd,          // stub = 0
    decimal                          EstimatedShippingFeeVnd, // stub = 0
    decimal                          TotalVnd,
    decimal                          DepositVnd,
    decimal                          RemainingPaymentVnd,
    bool                             WalletBalanceSufficient, // stub = true
    decimal                          WalletBalanceVnd,        // stub = 0
    decimal                          WalletShortageVnd        // stub = 0
);

// ── Confirm checkout ──────────────────────────────────────────────────────────

/// Response aligned with FE ConfirmCheckoutResponse interface.
public record ConfirmCheckoutResponse(
    List<string> CreatedOrderIds,
    decimal      TotalChargedFromWallet,   // stub = 0 (wallet Phase 8)
    string       CountdownDeadline         // ISO-8601 — payment deadline
);

// ── Requests ──────────────────────────────────────────────────────────────────

/// ShopId is NOT sent by the client — the service derives it from the product.
public record AddCartItemRequest(
    [Required] Guid     ProductId,
    [Required] Guid     VariantId,
    [Range(1, 9999)] int Quantity
);

public record UpdateCartItemQuantityRequest(
    [Range(1, 9999)] int Quantity
);

/// Client selects shops (checkboxes in cart UI).
/// Null / empty = include all shops.
public record CheckoutPreviewRequest(
    List<Guid>? ShopIds,
    string?     DeliveryAddressNote
);

public record ConfirmCheckoutRequest(
    List<Guid>? ShopIds,
    string?     DeliveryAddressNote,
    string?     CustomerNote
);
