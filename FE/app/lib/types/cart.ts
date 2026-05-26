// ── Cart display ──────────────────────────────────────────────────────────────
export interface CartItemResponse {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  variantName: string | null;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
  quantity: number;
  priceCnySnapshot: number;
  lineTotalCny: number;
  addedAt: string;
}

export interface CartGroupByShopResponse {
  shopId: string;
  shopName: string;
  subtotalCny: number;
  itemCount: number;
  items: CartItemResponse[];
}

export interface CartResponse {
  id: string;
  status: string;
  totalItemCount: number;
  subtotalCny: number;
  createdAt: string;
  groupsByShop: CartGroupByShopResponse[];
}

// ── Checkout preview ──────────────────────────────────────────────────────────
export interface CheckoutPreviewItemResponse {
  shopId: string;
  shopName: string;
  subtotalCny: number;
  subtotalVnd: number;
  itemCount: number;
}

export interface CheckoutPreviewGroupResponse {
  shopId: string;
  shopName: string;
  subtotalCny: number;
  subtotalVnd: number;
  itemCount: number;
  hasForbiddenProducts: boolean;
  warnings: string[];
}

export interface CheckoutPreviewResponse {
  exchangeRateVndPerCny: number;
  rateAsOf: string;
  groups: CheckoutPreviewGroupResponse[];
  subtotalVnd: number;
  serviceFeeVnd: number;
  estimatedShippingFeeVnd: number;
  totalVnd: number;
  depositVnd: number;
  remainingPaymentVnd: number;
  walletBalanceSufficient: boolean;
  walletBalanceVnd: number;
  walletShortageVnd: number;
}

// ── Confirm checkout ──────────────────────────────────────────────────────────
export interface ConfirmCheckoutItemResponse {
  orderId: string;
  shopId: string;
  shopName: string;
  depositVnd: number;
}

export interface ConfirmCheckoutResponse {
  createdOrderIds: string[];
  totalChargedFromWallet: number;
  countdownDeadline: string;
}

// ── Requests ──────────────────────────────────────────────────────────────────
export interface AddCartItemRequest {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemQuantityRequest {
  quantity: number;
}

export interface CheckoutPreviewRequest {
  shopIds: string[];
  deliveryAddressNote?: string;
}

export interface ConfirmCheckoutRequest {
  shopIds: string[];
  deliveryAddressNote?: string;
  customerNote?: string;
}
