import { useState, useEffect, useMemo } from "react";
import { redirect, Link } from "react-router";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { store } from "~/lib/feature/store";
import { cartApi } from "~/lib/api/cart";
import { useCart } from "~/lib/hooks/useCart";
import { CartItemCard } from "~/components/customer/CartItemCard";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND } from "~/lib/utils/format";
import type { CartResponse, CheckoutPreviewResponse } from "~/lib/types/cart";
import type { Route } from "./+types/cart";

// Redux hooks & thunks
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress
} from "~/lib/feature/customerProfile/customerProfileThunk";
import type { CustomerAddressDto, CreateCustomerAddressDto } from "~/lib/types/customerProfile";

// Phosphor icons
import {
  PiMapPinBold,
  PiPlusBold,
  PiPencilSimpleBold,
  PiCheckBold,
  PiXBold,
  PiTrashBold,
  PiNotebookBold,
  PiShieldCheckBold,
  PiCheckCircleBold,
  PiClockBold,
  PiShoppingCartBold,
  PiStorefrontBold,
  PiWarningCircleBold
} from "react-icons/pi";

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
  const dispatch = useAppDispatch();

  // Redux Addresses state
  const { addresses, status: profileStatus } = useAppSelector(
    (state) => state.customerProfileState
  );

  const { cart, loading, error, setError, updateQuantity, removeItem, clearCart, reload } =
    useCart(loaderData.cart);

  // Shop selection for checkout
  const allShopIds = cart?.groupsByShop?.map((g) => g.shopId) ?? [];
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(allShopIds);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [insuranceOption, setInsuranceOption] = useState<string>("none");
  const [shippingLine, setShippingLine] = useState<string>("Tmdt");
  const [preview, setPreview] = useState<CheckoutPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string[] | null>(null);

  // Address UI state
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddressDto | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Address Form State
  const [formLabel, setFormLabel] = useState("");
  const [formRecipientName, setFormRecipientName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddressLine, setFormAddressLine] = useState("");
  const [formProvinceCode, setFormProvinceCode] = useState("");
  const [formDistrictCode, setFormDistrictCode] = useState("");
  const [formWardCode, setFormWardCode] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch addresses on mount
  useEffect(() => {
    dispatch(fetchMyAddresses());
  }, [dispatch]);

  // Toast notifications for cart errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error, setError]);


  // Set default address or first address on load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault && a.isActive) || addresses.find((a) => a.isActive);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [addresses, selectedAddressId]);

  // Format deliveryAddressNote when active address changes
  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId && a.isActive) || null;
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (activeAddress) {
      const formatted = [
        activeAddress.recipientName,
        activeAddress.phone,
        [
          activeAddress.addressLine,
          activeAddress.wardCode,
          activeAddress.districtCode,
          activeAddress.provinceCode,
        ]
          .filter(Boolean)
          .join(", "),
      ]
        .filter(Boolean)
        .join(" | ");
      setDeliveryNote(formatted);
      setPreview(null); // Force refresh preview when active address changes
    } else {
      setDeliveryNote("");
    }
  }, [activeAddress]);

  function toggleShop(shopId: string) {
    setSelectedShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
    );
    setPreview(null);
  }

  async function handlePreview() {
    if (selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await cartApi.previewCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
        insuranceOption: insuranceOption,
        shippingLine: shippingLine,
      });
      setPreview(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("cart.preview_error"));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function executeConfirmCheckout() {
    setIsConfirmModalOpen(false);
    if (!preview || selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }

    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await cartApi.confirmCheckout({
        shopIds: selectedShopIds,
        deliveryAddressNote: deliveryNote || undefined,
        customerNote: customerNote || undefined,
        insuranceOption: insuranceOption,
        shippingLine: shippingLine,
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

  function handleConfirm() {
    if (!preview || selectedShopIds.length === 0) return;
    if (!deliveryNote) {
      setError("Vui lòng chọn hoặc điền thông tin địa chỉ nhận hàng.");
      return;
    }
    setIsConfirmModalOpen(true);
  }

  // Address Creation & Edit Handlers
  const handleOpenAddForm = () => {
    setEditingAddress(null);
    setFormLabel("");
    setFormRecipientName("");
    setFormPhone("");
    setFormAddressLine("");
    setFormProvinceCode("");
    setFormDistrictCode("");
    setFormWardCode("");
    setFormIsDefault(false);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditForm = (addr: CustomerAddressDto) => {
    setEditingAddress(addr);
    setFormLabel(addr.label || "");
    setFormRecipientName(addr.recipientName);
    setFormPhone(addr.phone);
    setFormAddressLine(addr.addressLine);
    setFormProvinceCode(addr.provinceCode || "");
    setFormDistrictCode(addr.districtCode || "");
    setFormWardCode(addr.wardCode || "");
    setFormIsDefault(addr.isDefault);
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRecipientName.trim() || !formPhone.trim() || !formAddressLine.trim() || !formProvinceCode.trim()) {
      setFormError("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    setFormError("");

    const payload: CreateCustomerAddressDto = {
      label: formLabel.trim() || undefined,
      recipientName: formRecipientName.trim(),
      phone: formPhone.trim(),
      addressLine: formAddressLine.trim(),
      provinceCode: formProvinceCode.trim(),
      districtCode: formDistrictCode.trim() || undefined,
      wardCode: formWardCode.trim() || undefined,
      isDefault: formIsDefault,
    };

    try {
      if (editingAddress) {
        const result = await dispatch(updateAddress({ id: editingAddress.id, data: payload })).unwrap();
        // If set to default, backend sets others to false, dispatch triggers slice update
        setSelectedAddressId(editingAddress.id);
      } else {
        const result = await dispatch(createAddress(payload)).unwrap();
        // result is CustomerAddressDto, select it automatically
        if (result && result.id) {
          setSelectedAddressId(result.id);
        }
      }
      setIsFormModalOpen(false);
      dispatch(fetchMyAddresses());
    } catch (err: any) {
      setFormError(err || "Không thể lưu địa chỉ");
    }
  };

  // ── Checkout success ────────────────────────────────────────────────────────
  if (checkoutSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center font-sans">
        <div className="flex justify-center mb-4 text-[#ef4444]">
          <PiCheckCircleBold className="text-6xl" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">
          {t("cart.checkout_success")}
        </h1>
        <p className="text-gray-500 mb-2">
          {t("cart.orders_created", { count: checkoutSuccess.length })}
        </p>
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 font-medium flex items-center justify-center gap-1.5">
          <PiClockBold className="text-base" /> {t("cart.deposit_deadline")}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            {t("cart.view_orders")}
          </Link>
          <button
            onClick={() => setCheckoutSuccess(null)}
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
          <PiShoppingCartBold className="text-6xl" />
        </div>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">{t("cart.empty")}</h1>
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
            const isSelected = selectedShopIds.includes(group.shopId);
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
                    onChange={() => toggleShop(group.shopId)}
                    className="rounded border-gray-300 text-black focus:ring-black h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <PiStorefrontBold className="text-base text-gray-400" />
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
        <div className="space-y-4">
          {/* Active Address Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5">
              <h2 className="text-sm font-bold text-black flex items-center gap-1.5">
                <PiMapPinBold className="text-base text-gray-400" />
                Địa chỉ nhận hàng
              </h2>
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSelectModalOpen(true)}
                  className="text-xs font-semibold text-black hover:underline"
                >
                  Thay đổi
                </button>
              )}
            </div>

            {activeAddress ? (
              <div className="space-y-1.5 text-xs text-[#2F3437]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-black">
                    {activeAddress.recipientName}
                  </span>
                  <span className="font-mono text-gray-500">
                    {activeAddress.phone}
                  </span>
                  {activeAddress.label && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {activeAddress.label}
                    </span>
                  )}
                  {activeAddress.isDefault && (
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-100">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {activeAddress.addressLine}
                  {activeAddress.wardCode && `, ${activeAddress.wardCode}`}
                  {activeAddress.districtCode && `, ${activeAddress.districtCode}`}
                  {activeAddress.provinceCode && `, ${activeAddress.provinceCode}`}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="w-full flex flex-col items-center justify-center py-6 px-4 border border-dashed border-gray-300 rounded hover:border-black transition-colors group text-center"
              >
                <PiPlusBold className="text-gray-400 group-hover:text-black mb-1.5 text-base" />
                <span className="text-xs font-semibold text-gray-500 group-hover:text-black">
                  Thêm địa chỉ nhận hàng
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Vui lòng cập nhật để thực hiện đặt hàng
                </span>
              </button>
            )}
          </div>

          {/* Delivery Note / Special instruction */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-black flex items-center gap-1.5">
              <PiNotebookBold className="text-base text-gray-400" />
              {t("cart.delivery_info")}
            </h2>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                Ghi chú cho nhân viên mua hàng
              </label>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder={t("cart.customer_note_placeholder")}
                rows={2}
                className="w-full text-xs border border-gray-300 rounded px-2.5 py-1.5 resize-none focus:border-black focus:outline-none"
              />
            </div>
          </div>

          {/* Shipping Line Option */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
              <PiStorefrontBold className="text-base text-gray-400" />
              Phương thức vận chuyển
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Tmdt", label: "TMĐT", desc: "Tiêu chuẩn" },
                { value: "Bm", label: "Biên mậu", desc: "Tiết kiệm" },
                { value: "OfficialQuota", label: "Chính ngạch", desc: "Hóa đơn VAT" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setShippingLine(opt.value);
                    setPreview(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${shippingLine === opt.value
                    ? "border-black bg-neutral-50 text-black font-semibold"
                    : "border-gray-200 hover:bg-gray-50 text-gray-500"
                    }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <span className="text-[9px] opacity-75 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
            {shippingLine === "OfficialQuota" && (
              <p className="text-[10px] text-amber-600 mt-2 bg-amber-50 p-1.5 rounded">
                * Lưu ý: Hàng chính ngạch sẽ phát sinh Phí ủy thác nhập khẩu, Thuế VAT và Thuế nhập khẩu.
              </p>
            )}
          </div>

          {/* Insurance Option */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
              <PiShieldCheckBold className="text-base text-gray-400" />
              {t("cart.insurance_option", "Tùy chọn bảo hiểm")}
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "none", label: "Không", desc: "0% phí" },
                { value: "basic", label: "Cơ bản", desc: "2% phí" },
                { value: "full", label: "Toàn bộ", desc: "5% phí" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setInsuranceOption(opt.value);
                    setPreview(null); // Clear preview when changing option to force refresh
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded border text-center transition-all ${insuranceOption === opt.value
                    ? "border-black bg-neutral-50 text-black font-semibold"
                    : "border-gray-200 hover:bg-gray-50 text-gray-500"
                    }`}
                >
                  <span className="text-xs">{opt.label}</span>
                  <span className="text-[9px] opacity-75 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              * Bảo hiểm hỗ trợ bảo vệ đơn hàng khi vận chuyển nếu xảy ra thất lạc.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
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
                <span className="text-black font-bold">
                  {formatCNY(
                    (cart?.groupsByShop ?? [])
                      .filter((g) => selectedShopIds.includes(g.shopId))
                      .reduce((s, g) => s + g.subtotalCny, 0)
                  )}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">{t("cart.rate_note")}</p>
            </div>

            {/* Preview result */}
            {preview && (
              <div className="bg-gray-50 rounded p-3.5 mb-4 space-y-2 text-xs border border-gray-200/60 font-sans">
                <div className="flex justify-between text-gray-500">
                  <span>Tỷ giá áp dụng</span>
                  <span className="font-medium">
                    {preview.exchangeRateVndPerCny.toLocaleString("vi-VN")} ₫/¥
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-1.5">
                  <span>Tiền hàng</span>
                  <span className="font-mono">{formatVND(preview.subtotalVnd)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí dịch vụ</span>
                  <span className="font-mono">{formatVND(preview.serviceFeeVnd)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí kiểm hàng</span>
                  <span className="font-mono">{formatVND(preview.inspectionFeeVnd)}</span>
                </div>
                {preview.insuranceFeeVnd > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí bảo hiểm ({insuranceOption})</span>
                    <span className="font-mono">{formatVND(preview.insuranceFeeVnd)}</span>
                  </div>
                )}
                {preview.importEntrustmentFeeVnd > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Phí ủy thác nhập khẩu</span>
                    <span className="font-mono">{formatVND(preview.importEntrustmentFeeVnd)}</span>
                  </div>
                )}
                {preview.importDutyVnd > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế nhập khẩu</span>
                    <span className="font-mono">{formatVND(preview.importDutyVnd)}</span>
                  </div>
                )}
                {preview.importVatVnd > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Thuế VAT</span>
                    <span className="font-mono">{formatVND(preview.importVatVnd)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400 italic">
                  <span>Phí ship VN (ước tính)</span>
                  <span className="font-mono">{formatVND(preview.estimatedShippingFeeVnd)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>Tổng giá trị đơn</span>
                  <span className="font-mono">{formatVND(preview.totalVnd)}</span>
                </div>
                <div className="flex justify-between text-black font-bold border-t border-gray-200 pt-1.5 mt-0.5">
                  <span>Số tiền đặt cọc</span>
                  <span className="text-red-600 font-mono">{formatVND(preview.depositVnd)}</span>
                </div>

                {/* Wallet Balance Info */}
                <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-1.5">
                  <span>Số dư ví hiện tại</span>
                  <span className="font-medium text-gray-700 font-mono">{formatVND(preview.walletBalanceVnd)}</span>
                </div>

                {!preview.walletBalanceSufficient ? (
                  <div className="text-rose-700 bg-rose-50 border border-rose-100 rounded p-2.5 text-[10px] mt-2 font-semibold leading-normal flex items-start gap-1.5">
                    <PiWarningCircleBold className="text-xs shrink-0 mt-0.5" />
                    <span>
                      {t("cart.wallet_insufficient", { amount: formatVND(preview.walletShortageVnd) })}
                    </span>
                  </div>
                ) : (
                  <div className="text-green-700 bg-green-50 border border-green-100 rounded p-2.5 text-[10px] mt-2 font-semibold flex items-center gap-1.5">
                    <PiCheckCircleBold className="text-xs shrink-0" />
                    <span>Số dư ví khả dụng để đóng cọc.</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full text-xs font-semibold rounded"
                onClick={handlePreview}
                loading={previewLoading}
                disabled={selectedShopIds.length === 0 || loading || !deliveryNote}
              >
                {t("cart.preview")}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full text-xs font-semibold rounded bg-primary hover:bg-primary-dark text-white border-0"
                onClick={handleConfirm}
                loading={checkoutLoading}
                disabled={!preview || selectedShopIds.length === 0 || !deliveryNote}
              >
                {t("cart.checkout")} →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: SELECT ADDRESS LIST */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col font-sans max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <PiMapPinBold className="text-gray-400" />
                Chọn địa chỉ nhận hàng
              </h3>
              <button
                onClick={() => setIsSelectModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 py-1 flex-1 custom-scrollbar">
              {addresses
                .filter((a) => a.isActive)
                .map((addr) => {
                  const isCurrent = addr.id === selectedAddressId;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setIsSelectModalOpen(false);
                      }}
                      className={`p-4 rounded border text-left cursor-pointer transition-all relative ${isCurrent
                        ? "border-black bg-neutral-50"
                        : "border-gray-200 hover:border-gray-400 bg-white"
                        }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm text-black">
                          {addr.recipientName}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {addr.phone}
                        </span>
                        {addr.label && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {addr.label}
                          </span>
                        )}
                        {addr.isDefault && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-green-50 text-green-700 border border-green-100">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-normal pr-14">
                        {addr.addressLine}
                        {addr.wardCode && `, ${addr.wardCode}`}
                        {addr.districtCode && `, ${addr.districtCode}`}
                        {addr.provinceCode && `, ${addr.provinceCode}`}
                      </p>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditForm(addr);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors"
                          title="Sửa địa chỉ"
                        >
                          <PiPencilSimpleBold className="text-base" />
                        </button>
                        {isCurrent && (
                          <PiCheckBold className="text-black text-base" />
                        )}
                      </div>
                    </div>
                  );
                })}

              {addresses.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Chưa có địa chỉ giao hàng nào.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#EAEAEA] mt-4">
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline"
              >
                <PiPlusBold />
                Thêm địa chỉ mới
              </button>
              <button
                type="button"
                onClick={() => setIsSelectModalOpen(false)}
                className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT ADDRESS FORM */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-lg w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA] mb-4">
              <h3 className="text-base font-serif font-bold text-black">
                {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <PiXBold className="text-lg" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 text-xs rounded bg-rose-50 border border-rose-100 text-rose-700 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Tên người nhận *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRecipientName}
                    onChange={(e) => setFormRecipientName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 0987654321..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                  Địa chỉ chi tiết (Số nhà, Tên đường) *
                </label>
                <input
                  type="text"
                  required
                  value={formAddressLine}
                  onChange={(e) => setFormAddressLine(e.target.value)}
                  placeholder="VD: Số 12, Ngõ 34, Phố Huế..."
                  className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Tỉnh / Thành phố *
                  </label>
                  <input
                    type="text"
                    required
                    value={formProvinceCode}
                    onChange={(e) => setFormProvinceCode(e.target.value)}
                    placeholder="VD: Hà Nội..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Quận / Huyện
                  </label>
                  <input
                    type="text"
                    value={formDistrictCode}
                    onChange={(e) => setFormDistrictCode(e.target.value)}
                    placeholder="VD: Cầu Giấy..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Phường / Xã
                  </label>
                  <input
                    type="text"
                    value={formWardCode}
                    onChange={(e) => setFormWardCode(e.target.value)}
                    placeholder="VD: Dịch Vọng..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">
                    Nhãn (Nhà riêng, Văn phòng...)
                  </label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="VD: Nhà riêng..."
                    className="w-full rounded border border-[#EAEAEA] px-3 py-2 text-sm text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    id="formIsDefault"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded border-[#EAEAEA] text-black focus:ring-black h-4 w-4"
                  />
                  <label htmlFor="formIsDefault" className="text-sm font-semibold text-black cursor-pointer select-none">
                    Đặt làm mặc định
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4.5 py-2 rounded transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4.5 py-2 rounded transition-colors"
                >
                  Lưu địa chỉ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM CHECKOUT DIALOG */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#EAEAEA] rounded-lg max-w-sm w-full p-6 shadow-2xl flex flex-col font-sans">
            <div className="space-y-3">
              <h4 className="text-base font-serif font-bold text-black flex items-center gap-1.5">
                <PiWarningCircleBold className="text-primary text-lg" />
                Xác nhận đặt hàng
              </h4>
              <p className="text-xs text-gray-600 leading-normal">
                {t("cart.confirm_dialog", "Bạn có chắc chắn muốn tiến hành đặt cọc và tạo đơn hàng này không?")}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#EAEAEA] mt-5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="bg-white hover:bg-gray-100 text-[#2F3437] border border-[#EAEAEA] text-xs font-semibold px-4 py-2 rounded transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={executeConfirmCheckout}
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
