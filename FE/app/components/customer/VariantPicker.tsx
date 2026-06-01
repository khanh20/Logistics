import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/utils/cn";
import { formatCNY, formatVND } from "~/lib/utils/format";
import type { ProductDetail, ProductVariant, PriceTier } from "~/lib/types/product";

// Tính giá hiệu lực theo bậc số lượng (1688 có volume pricing).
function getTierPrice(tiers: PriceTier[], quantity: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  for (const tier of tiers) {
    const inRange =
      quantity >= tier.minQuantity &&
      (tier.maxQuantity == null || quantity <= tier.maxQuantity);
    if (inRange) return tier.priceCny;
  }
  return null;
}

function getEffectivePrice(variant: ProductVariant, quantity: number): number {
  return getTierPrice(variant.priceTiers, quantity) ?? variant.priceCnyCurrent;
}

interface VariantPickerProps {
  product: ProductDetail;
  // Tỉ giá VNĐ/CNY để hiện giá quy đổi. Bỏ qua nếu không truyền.
  rateVndPerCny?: number;
  adding?: boolean;
  message?: { type: "success" | "error"; text: string } | null;
  // Gọi khi user bấm thêm giỏ. Parent xử lý API.
  onAddToCart: (variantId: string, quantity: number) => void;
}

export function VariantPicker({
  product,
  rateVndPerCny,
  adding,
  message,
  onAddToCart,
}: VariantPickerProps) {
  const { t } = useTranslation();
  const availableVariants = product.variants.filter((v) => v.isAvailable);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    availableVariants.length === 1 ? availableVariants[0] : null
  );
  const [quantity, setQuantity] = useState(1);

  const unitPrice = selectedVariant ? getEffectivePrice(selectedVariant, quantity) : null;
  const totalCny = unitPrice != null ? unitPrice * quantity : null;

  return (
    <div className="space-y-4">
      {/* Giá */}
      <div className="bg-gray-50 rounded-xl px-4 py-3">
        {unitPrice != null ? (
          <>
            <p className="text-2xl font-bold text-primary">{formatCNY(unitPrice)}</p>
            {rateVndPerCny != null && (
              <p className="text-sm text-gray-600">
                ≈ {formatVND(unitPrice * rateVndPerCny)}
              </p>
            )}
          </>
        ) : (
          <p className="text-lg font-semibold text-gray-700">
            {formatCNY(product.variants[0]?.priceCnyCurrent ?? 0)} —{" "}
            {formatCNY(product.variants[product.variants.length - 1]?.priceCnyCurrent ?? 0)}
          </p>
        )}
      </div>

      {/* Variant selector */}
      {product.variants.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t("product.choose_variant")}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isUnavailable = !variant.isAvailable;
              return (
                <button
                  key={variant.id}
                  onClick={() => !isUnavailable && setSelectedVariant(variant)}
                  disabled={isUnavailable}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : isUnavailable
                      ? "border-gray-200 text-gray-300 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:border-gray-500"
                  )}
                >
                  {variant.translatedName ?? variant.variantName}
                  {isUnavailable && (
                    <span className="ml-1 text-xs">({t("product.out_of_stock")})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Volume pricing */}
      {selectedVariant && selectedVariant.priceTiers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            {t("product.volume_pricing")}
          </p>
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("product.tier_min_qty")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("product.tier_max_qty")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("product.tier_price_cny")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {selectedVariant.priceTiers.map((tier, i) => (
                  <tr
                    key={i}
                    className={cn(
                      getTierPrice(selectedVariant.priceTiers, quantity) === tier.priceCny
                        ? "bg-primary/5 font-semibold text-primary"
                        : "text-gray-700"
                    )}
                  >
                    <td className="px-3 py-1.5">{tier.minQuantity}</td>
                    <td className="px-3 py-1.5">{tier.maxQuantity ?? "∞"}</td>
                    <td className="px-3 py-1.5 text-right">{formatCNY(tier.priceCny)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-gray-700 w-20">{t("product.quantity_label")}</p>
        <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            +
          </button>
        </div>
        {totalCny != null && quantity > 1 && (
          <span className="text-sm text-gray-500">= {formatCNY(totalCny)}</span>
        )}
      </div>

      {message && (
        <p
          className={cn(
            "text-sm rounded-lg px-4 py-2",
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          )}
        >
          {message.text}
        </p>
      )}

      <Button
        className="w-full"
        size="lg"
        loading={adding}
        disabled={product.isForbidden}
        onClick={() => {
          if (selectedVariant) onAddToCart(selectedVariant.id, quantity);
        }}
      >
        {product.isForbidden ? t("product.forbidden") : t("product.add_to_cart")}
      </Button>
    </div>
  );
}
