import { useState, useCallback, useRef } from "react";
import { cartApi } from "~/lib/api/cart";
import type { CartResponse } from "~/lib/types/cart";

/**
 * Lightweight cart hook — manages local cart state & exposes API mutations.
 * Data is initially loaded in the route's clientLoader; this hook handles
 * client-side optimistic updates after mutations.
 *
 * Chống spam API: mọi mutation bật `loading` NGAY (để UI disable nút) và có
 * khoá `busyRef` bỏ qua click trùng trước cả khi React re-render — nên mỗi
 * chu kỳ chỉ gọi API một lần dù bấm +/- / xoá liên tục.
 */
export function useCart(initial: CartResponse | null) {
  const [cart, setCart] = useState<CartResponse | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  // Chạy 1 mutation tại một thời điểm; click trùng khi đang bận -> bỏ qua.
  const runExclusive = useCallback(async (fn: () => Promise<void>, errMsg: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? errMsg);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    const res = await cartApi.getCart();
    setCart(res.data);
  }, []);

  const reload = useCallback(
    () => runExclusive(refetch, "Có lỗi xảy ra"),
    [runExclusive, refetch]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) =>
      runExclusive(async () => {
        await cartApi.updateQuantity(itemId, { quantity });
        await refetch();
      }, "Không thể cập nhật số lượng"),
    [runExclusive, refetch]
  );

  const removeItem = useCallback(
    (itemId: string) =>
      runExclusive(async () => {
        await cartApi.removeItem(itemId);
        await refetch();
      }, "Không thể xóa sản phẩm"),
    [runExclusive, refetch]
  );

  const clearCart = useCallback(
    () =>
      runExclusive(async () => {
        await cartApi.clearCart();
        setCart(null);
      }, "Không thể xóa giỏ hàng"),
    [runExclusive]
  );

  return { cart, setCart, loading, error, setError, reload, updateQuantity, removeItem, clearCart };
}
