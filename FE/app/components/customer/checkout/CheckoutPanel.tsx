import React from "react";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Notebook,
  Storefront,
  ShieldCheck,
  WarningCircle,
  CheckCircle,
  Plus,
} from "~/components/shared/icons";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND } from "~/lib/utils/format";
import type { CartResponse } from "~/lib/types/cart";
import type { useCartCheckout } from "./useCartCheckout";

type CheckoutPanelProps = ReturnType<typeof useCartCheckout> & {
  cart: CartResponse | null;
  cartLoading: boolean;
};

export function CheckoutPanel({
  cart,
  cartLoading,
  addresses,
  selectedShopIds,
  deliveryNote,
  customerNote,
  setCustomerNote,
  insuranceOption,
  setInsuranceOption,
  shippingLine,
  setShippingLine,
  preview,
  setPreview,
  previewLoading,
  checkoutLoading,
  setIsSelectModalOpen,
  activeAddress,
  handleOpenAddForm,
  handlePreview,
  handleConfirm,
}: CheckoutPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Active Address Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5">
          <h2 className="text-sm font-bold text-black flex items-center gap-1.5">
            <MapPin className="text-base text-gray-400" />
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
            <Plus className="text-gray-400 group-hover:text-black mb-1.5 text-base" />
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
          <Notebook className="text-base text-gray-400" />
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
          <Storefront className="text-base text-gray-400" />
          Phương thức vận chuyển
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "Tmdt", label: "TMĐT", desc: "Tiêu chuẩn" },
            { value: "Bm", label: "Biên mậu", desc: "Tiết kiệm" },
            {
              value: "OfficialQuota",
              label: "Chính ngạch",
              desc: "Hóa đơn VAT",
            },
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
            * Lưu ý: Hàng chính ngạch sẽ phát sinh Phí ủy thác nhập khẩu, Thuế
            VAT và Thuế nhập khẩu.
          </p>
        )}
      </div>

      {/* Insurance Option */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1">
          <ShieldCheck className="text-base text-gray-400" />
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
                setPreview(null);
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
              <div
                key={g.shopId}
                className="flex justify-between text-xs text-gray-600"
              >
                <span className="truncate mr-2">{g.shopName}</span>
                <span className="shrink-0 font-medium">
                  {formatCNY(g.subtotalCny)}
                </span>
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
              <span className="font-mono">
                {formatVND(preview.serviceFeeVnd + (preview.serviceFeeDiscountVnd ?? 0))}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Phí kiểm hàng</span>
              <span className="font-mono">
                {formatVND(preview.inspectionFeeVnd + (preview.inspectionFeeDiscountVnd ?? 0))}
              </span>
            </div>
            {preview.insuranceFeeVnd > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Phí bảo hiểm ({insuranceOption})</span>
                <span className="font-mono">
                  {formatVND(preview.insuranceFeeVnd)}
                </span>
              </div>
            )}
            {preview.importEntrustmentFeeVnd > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Phí ủy thác nhập khẩu</span>
                <span className="font-mono">
                  {formatVND(preview.importEntrustmentFeeVnd)}
                </span>
              </div>
            )}
            {preview.importDutyVnd > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Thuế nhập khẩu</span>
                <span className="font-mono">
                  {formatVND(preview.importDutyVnd)}
                </span>
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
              <span className="font-mono">
                {formatVND(preview.estimatedShippingFeeVnd)}
              </span>
            </div>
            {((preview.serviceFeeDiscountVnd ?? 0) + (preview.inspectionFeeDiscountVnd ?? 0)) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold border-t border-dashed border-gray-200/80 pt-1.5 mt-1">
                <span>Giảm giá hạng thành viên</span>
                <span className="font-mono">
                  -{formatVND((preview.serviceFeeDiscountVnd ?? 0) + (preview.inspectionFeeDiscountVnd ?? 0))}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Tổng giá trị đơn</span>
              <span className="font-mono">{formatVND(preview.totalVnd)}</span>
            </div>
            <div className="flex justify-between text-black font-bold border-t border-gray-200 pt-1.5 mt-0.5">
              <span>Số tiền đặt cọc</span>
              <span className="text-red-600 font-mono">
                {formatVND(preview.depositVnd)}
              </span>
            </div>

            {/* Wallet Balance Info */}
            <div className="flex justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-1.5">
              <span>Số dư ví hiện tại</span>
              <span className="font-medium text-gray-700 font-mono">
                {formatVND(preview.walletBalanceVnd)}
              </span>
            </div>

            {!preview.walletBalanceSufficient ? (
              <div className="text-rose-700 bg-rose-50 border border-rose-100 rounded p-2.5 text-[10px] mt-2 font-semibold leading-normal flex items-start gap-1.5">
                <WarningCircle className="text-xs shrink-0 mt-0.5" />
                <span>
                  {t("cart.wallet_insufficient", {
                    amount: formatVND(preview.walletShortageVnd),
                  })}
                </span>
              </div>
            ) : (
              <div className="text-green-700 bg-green-50 border border-green-100 rounded p-2.5 text-[10px] mt-2 font-semibold flex items-center gap-1.5">
                <CheckCircle className="text-xs shrink-0" />
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
            disabled={
              selectedShopIds.length === 0 || cartLoading || !deliveryNote
            }
          >
            {t("cart.preview")}
          </Button>
          <Button
            variant="primary"
            size="md"
            className="w-full text-xs font-semibold rounded bg-primary hover:bg-primary-dark text-white border-0"
            onClick={handleConfirm}
            loading={checkoutLoading}
            disabled={
              !preview || selectedShopIds.length === 0 || !deliveryNote
            }
          >
            {t("cart.checkout")} →
          </Button>
        </div>
      </div>
    </div>
  );
}
