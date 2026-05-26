import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  CartResponse,
  CartItemResponse,
  CheckoutPreviewResponse,
  ConfirmCheckoutResponse,
  AddCartItemRequest,
  UpdateCartItemQuantityRequest,
  CheckoutPreviewRequest,
  ConfirmCheckoutRequest,
} from "~/lib/types/cart";

export const cartApi = {
  getCart: () =>
    apiModule1Client.get<unknown, ApiResponse<CartResponse>>("/api/cart"),

  addItem: (req: AddCartItemRequest) =>
    apiModule1Client.post<unknown, ApiResponse<CartItemResponse>>(
      "/api/cart/items",
      req
    ),

  updateQuantity: (itemId: string, req: UpdateCartItemQuantityRequest) =>
    apiModule1Client.patch<unknown, ApiResponse<CartItemResponse>>(
      `/api/cart/items/${itemId}`,
      req
    ),

  removeItem: (itemId: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(
      `/api/cart/items/${itemId}`
    ),

  clearCart: () =>
    apiModule1Client.delete<unknown, ApiResponse<null>>("/api/cart"),

  previewCheckout: (req: CheckoutPreviewRequest) =>
    apiModule1Client.post<unknown, ApiResponse<CheckoutPreviewResponse>>(
      "/api/cart/checkout/preview",
      req
    ),

  confirmCheckout: (req: ConfirmCheckoutRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ConfirmCheckoutResponse>>(
      "/api/cart/checkout/confirm",
      req
    ),
};
