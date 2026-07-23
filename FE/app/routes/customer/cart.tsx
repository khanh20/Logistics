import { useEffect } from "react";
import { redirect, Link } from "react-router";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { store } from "~/lib/feature/store";
import { cartApi } from "~/lib/api/cart";
import { useCart } from "~/lib/hooks/useCart";
import { CartItemCard } from "~/components/customer/CartItemCard";
import { formatCNY } from "~/lib/utils/format";
import type { CartResponse } from "~/lib/types/cart";
import type { Route } from "./+types/cart";

// Component & hooks
import {
  CheckCircle,
  Clock,
  MapPin,
  ShoppingCart,
  Storefront,
  WarningCircle,
  X,
} from "~/components/shared/icons";
import { useCartCheckout } from "~/components/customer/checkout/useCartCheckout";
import { AddressSelectModal } from "~/components/customer/checkout/AddressSelectModal";
import { AddressFormModal } from "~/components/customer/checkout/AddressFormModal";
import { CheckoutPanel } from "~/components/customer/checkout/CheckoutPanel";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Giỏ hàng — MuaHo" }];
}

export async function clientLoader() {
  const { token } = store.getState().authState;
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

  const {
    cart,
    loading,
    error,
    setError,
    updateQuantity,
    removeItem,
    clearCart,
    reload,
  } = useCart(loaderData.cart);

  const checkout = useCartCheckout(cart, reload);

  // Toast notifications for cart errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error, setError]);

  // ── Checkout success ────────────────────────────────────────────────────────
  if (checkout.checkoutSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center font-sans">
        <div className="flex justify-center mb-4 text-[#ef4444]">
          <CheckCircle className="text-6xl" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">
          {t("cart.checkout_success")}
        </h1>
        <p className="text-gray-500 mb-2">
          {t("cart.orders_created", {
            count: checkout.checkoutSuccess.length,
          })}
        </p>
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 font-medium flex items-center justify-center gap-1.5">
          <Clock className="text-base" /> {t("cart.deposit_deadline")}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            {t("cart.view_orders")}
          </Link>
          <button
            onClick={() => checkout.setCheckoutSuccess(null)}
            className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center font-sans">
        <div className="flex justify-center mb-4 text-gray-300">
          <ShoppingCart className="text-6xl" />
        </div>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">
          {t("cart.empty")}
        </h1>
        <p className="text-gray-400 mb-6">{t("cart.empty_hint")}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary-dark transition-colors"
        >
          {t("cart.browse_products")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">
          {t("cart.title")}
          <span className="ml-2 text-base font-normal text-gray-400 font-sans">
            ({t("cart.item_count", { count: cart.totalItemCount })})
          </span>
        </h1>
        <button
          onClick={clearCart}
          disabled={loading}
          className="text-xs font-semibold text-gray-400 hover:text-rose-600 transition-colors"
        >
          {t("cart.clear")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left — Item list by shop */}
        <div className="lg:col-span-2 space-y-4">
          {cart?.groupsByShop?.map((group) => {
            const isSelected = checkout.selectedShopIds.includes(group.shopId);
            return (
              <div
                key={group.shopId}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                {/* Shop header */}
                <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => checkout.toggleShop(group.shopId)}
                    className="rounded border-gray-300 text-black focus:ring-black h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Storefront className="text-base text-gray-400" />
                    {group.shopName}
                  </span>
                  <span className="ml-auto text-xs font-mono font-medium text-gray-500">
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
        <CheckoutPanel
          {...checkout}
          cart={cart}
          cartLoading={loading}
        />
      </div>

      {/* MODAL 1: SELECT ADDRESS LIST */}
      <AddressSelectModal
        {...checkout}
        isOpen={checkout.isSelectModalOpen}
        onClose={() => checkout.setIsSelectModalOpen(false)}
      />

      {/* MODAL 2: ADD / EDIT ADDRESS FORM */}
      <AddressFormModal
        {...checkout}
        isOpen={checkout.isFormModalOpen}
        onClose={() => checkout.setIsFormModalOpen(false)}
      />

      {/* MODAL 3: CONFIRM CHECKOUT DIALOG */}
      {checkout.isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <WarningCircle className="text-primary text-lg" />
                Xác nhận đặt hàng
              </h4>
              <p className="text-xs text-gray-600 leading-normal">
                {t(
                  "cart.confirm_dialog",
                  "Bạn có chắc chắn muốn tiến hành đặt cọc và tạo đơn hàng này không?"
                )}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-5">
              <button
                type="button"
                onClick={() => checkout.setIsConfirmModalOpen(false)}
                className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={checkout.executeConfirmCheckout}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
