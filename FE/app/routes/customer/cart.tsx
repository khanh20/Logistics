import { useState } from "react";
import { redirect, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "~/lib/stores/authStore";
import { cartApi } from "~/lib/api/cart";
import { useCart } from "~/lib/hooks/useCart";
import { CartItemCard } from "~/components/customer/CartItemCard";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND } from "~/lib/utils/format";
import type { CartResponse, CheckoutPreviewResponse } from "~/lib/types/cart";
import type { Route } from "./+types/cart";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Giỏ hàng — MuaHo" }];
}

export async function clientLoader() {
  const { token } = useAuthStore.getState();
  if (!token) throw redirect("/login");

  try {
    const res = await cartApi.getCart();
    return { cart: res.data as CartResponse };
  } catch {
    return { cart: null as CartResponse | null };
  }
}

export default function CartPage({
  loaderData,
}: {
  loaderData: { cart: CartResponse | null };
}) {
  const { t } = useTranslation();
  const { cart, loading, error, setError, updateQuantity, removeItem, clearCart, reload } =
    useCart(loaderData.cart);

  // Shop selection for checkout
  const allShopIds = cart?.groupsByShop?.map((g) => g.shopId) ?? [];
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(allShopIds);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string[] | null>(null);

  function toggleShop(shopId: string) {
    setSelectedShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
    );
    setPreview(null);
  }

  async function handlePreview() {
    if (selectedShopIds.length === 0) return;
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await cartApi.previewCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
      });
      setPreview(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("cart.preview_error"));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview || selectedShopIds.length === 0) return;
    if (!confirm(t("cart.confirm_dialog"))) return;

    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await cartApi.confirmCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
        customerNote: customerNote || undefined,
      });
      setCheckoutSuccess(res.data.createdOrderIds);
      await reload();
      setPreview(null);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("cart.checkout_error"));
    } finally {
      setCheckoutLoading(false);
    }
  }

  // ── Checkout success ────────────────────────────────────────────────────────
  if (checkoutSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t("cart.checkout_success")}
        </h1>
        <p className="text-gray-500 mb-2">
          {t("cart.orders_created", { count: checkoutSuccess.length })}
        </p>
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
          ⏰ {t("cart.deposit_deadline")}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            {t("cart.view_orders")}
          </Link>
          <button
            onClick={() => setCheckoutSuccess(null)}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t("cart.continue_shopping")}
          </button>
        </div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (!cart || cart.totalItemCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">{t("cart.empty")}</h1>
        <p className="text-gray-400 mb-6">{t("cart.empty_hint")}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          {t("cart.browse_products")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("cart.title")}
          <span className="ml-2 text-base font-normal text-gray-400">
            ({t("cart.item_count", { count: cart.totalItemCount })})
          </span>
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart} disabled={loading}>
          {t("cart.clear")}
        </Button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Item list by shop */}
        <div className="lg:col-span-2 space-y-4">
          {cart?.groupsByShop?.map((group) => {
            const isSelected = selectedShopIds.includes(group.shopId);
            return (
              <div
                key={group.shopId}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Shop header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleShop(group.shopId)}
                    className="rounded border-gray-300 accent-primary"
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    🏪 {group.shopName}
                  </span>
                  <span className="ml-auto text-sm text-gray-500">
                    {formatCNY(group.subtotalCny)}
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50 px-5">
                  {group.items.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — Checkout panel */}
        <div className="space-y-4">
          {/* Delivery note */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              {t("cart.delivery_info")}
            </h2>
            <textarea
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder={t("cart.delivery_placeholder")}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder={t("cart.customer_note_placeholder")}
              rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary mt-2"
            />
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              {t("cart.summary_title")}
            </h2>

            {/* Selected shops summary */}
            <div className="space-y-1 mb-3">
              {(cart?.groupsByShop ?? [])
                .filter((g) => selectedShopIds.includes(g.shopId))
                .map((g) => (
                  <div key={g.shopId} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate mr-2">{g.shopName}</span>
                    <span className="shrink-0 font-medium">{formatCNY(g.subtotalCny)}</span>
                  </div>
                ))}
            </div>

            <div className="border-t border-gray-100 pt-3 mb-4">
              <div className="flex justify-between text-sm font-semibold text-gray-900">
                <span>{t("cart.subtotal")}</span>
                <span className="text-primary">
                  {formatCNY(
                    (cart?.groupsByShop ?? [])
                      .filter((g) => selectedShopIds.includes(g.shopId))
                      .reduce((s, g) => s + g.subtotalCny, 0)
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t("cart.rate_note")}</p>
            </div>

            {/* Preview result */}
            {preview && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>{t("cart.rate_label")}</span>
                  <span className="font-medium">
                    {preview.exchangeRateVndPerCny.toLocaleString("vi-VN")} ₫/¥
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t("cart.product_total_vnd")}</span>
                  <span>{formatVND(preview.subtotalVnd)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t("cart.service_fee")}</span>
                  <span>{formatVND(preview.serviceFeeVnd)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t("cart.estimated_shipping")}</span>
                  <span>{formatVND(preview.estimatedShippingFeeVnd)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>{t("cart.grand_total")}</span>
                  <span>{formatVND(preview.totalVnd)}</span>
                </div>
                <div className="flex justify-between text-primary font-bold text-sm border-t border-gray-200 pt-1.5 mt-0.5">
                  <span>{t("cart.deposit_label")}</span>
                  <span>{formatVND(preview.depositVnd)}</span>
                </div>
                {!preview.walletBalanceSufficient && (
                  <p className="text-red-600 bg-red-50 rounded px-2 py-1 text-xs mt-1">
                    {t("cart.wallet_insufficient", { amount: formatVND(preview.walletShortageVnd) })}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={handlePreview}
                loading={previewLoading}
                disabled={selectedShopIds.length === 0 || loading}
              >
                {t("cart.preview")}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleConfirm}
                loading={checkoutLoading}
                disabled={!preview || selectedShopIds.length === 0}
              >
                {t("cart.checkout")} →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
