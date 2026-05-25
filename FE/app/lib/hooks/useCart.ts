import { useState, useCallback } from "react";
import { cartApi } from "~/lib/api/cart";
import type { CartResponse } from "~/lib/types/cart";

/**
 * Lightweight cart hook — manages local cart state & exposes API mutations.
 * Data is initially loaded in the route's clientLoader; this hook handles
 * client-side optimistic updates after mutations.
 */
export function useCart(initial: CartResponse | null) {
  const [cart, setCart] = useState<CartResponse | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cartApi.getCart();
      setCart(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        await cartApi.updateQuantity(itemId, { quantity });
        await reload();
      } catch (err: unknown) {
        setError((err as { message?: string })?.message ?? "Không thể cập nhật số lượng");
      }
    },
    [reload]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      try {
        await cartApi.removeItem(itemId);
        await reload();
      } catch (err: unknown) {
        setError((err as { message?: string })?.message ?? "Không thể xóa sản phẩm");
      }
    },
    [reload]
  );

  const clearCart = useCallback(async () => {
    try {
      await cartApi.clearCart();
      setCart(null);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Không thể xóa giỏ hàng");
    }
  }, []);

  return { cart, setCart, loading, error, setError, reload, updateQuantity, removeItem, clearCart };
}
