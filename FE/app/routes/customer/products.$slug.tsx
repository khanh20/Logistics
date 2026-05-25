import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "~/lib/stores/authStore";
import { productsApi } from "~/lib/api/products";
import { cartApi } from "~/lib/api/cart";
import { Button } from "~/components/ui/Button";
import { formatCNY } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { ProductVariant, PriceTier, ProductDetail } from "~/lib/types/product";
import type { Route } from "./+types/products.$slug";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sản phẩm — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const res = await productsApi.getBySlug(params.slug!);
  return { product: res.data as ProductDetail };
}

// ── Price tier helper ─────────────────────────────────────────────────────────
function getTierPrice(tiers: PriceTier[], quantity: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  for (const tier of tiers) {
    const inRange = quantity >= tier.minQuantity && (tier.maxQuantity == null || quantity <= tier.maxQuantity);
    if (inRange) return tier.priceCny;
  }
  return null;
}

function getEffectivePrice(variant: ProductVariant, quantity: number): number {
  const tierPrice = getTierPrice(variant.priceTiers, quantity);
  return tierPrice ?? variant.priceCnyCurrent;
}

export default function ProductDetailPage({
  loaderData,
}: {
  loaderData: { product: ProductDetail };
}) {
  const { t } = useTranslation();
  const { product } = loaderData;

  const availableVariants = product.variants.filter((v) => v.isAvailable);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    availableVariants.length === 1 ? availableVariants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const navigate = useNavigate();
  const { token } = useAuthStore.getState();
  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const activeImage = product.images[activeImageIdx] ?? primaryImage;

  const unitPrice = selectedVariant
    ? getEffectivePrice(selectedVariant, quantity)
    : null;

  async function handleAddToCart() {
    if (!selectedVariant) {
      setCartMsg({ type: "error", text: t("product.select_variant_first") });
      return;
    }
    if (!token) {
      navigate("/login");
      return;
    }

    setAddingToCart(true);
    setCartMsg(null);
    try {
      await cartApi.addItem({
        productId: product.id,
        variantId: selectedVariant.id,
        quantity,
      });
      setCartMsg({ type: "success", text: t("product.cart_added") });
    } catch (err: unknown) {
      setCartMsg({
        type: "error",
        text: (err as { message?: string })?.message ?? t("product.cart_error"),
      });
    } finally {
      setAddingToCart(false);
    }
  }

  const displayTitle = product.translatedTitle ?? product.originalTitle;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        {t("product.back_btn")}
      </Link>

      {/* Forbidden warning */}
      {product.isForbidden && (
        <div className="mb-5 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          ⚠️ {t("product.forbidden_warning")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left: Images ───────────────────────────────────────────────────── */}
        <div>
          {/* Main image */}
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mb-3">
            {activeImage ? (
              <img
                src={activeImage.url}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">
                📦
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors",
                    idx === activeImageIdx
                      ? "border-primary"
                      : "border-gray-200 hover:border-gray-400"
                  )}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Info & actions ───────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Title & meta */}
          <div>
            <div className="flex items-start gap-2 flex-wrap mb-1">
              {product.isFeatured && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                  ⭐ {t("product.featured_badge")}
                </span>
              )}
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {product.shop.platformName}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 leading-snug">{displayTitle}</h1>

            {product.translatedTitle && product.originalTitle !== displayTitle && (
              <p className="text-xs text-gray-400 mt-1">{product.originalTitle}</p>
            )}
          </div>

          {/* Shop & category */}
          <div className="text-sm text-gray-500 space-y-0.5">
            <p>
              <span className="font-medium text-gray-600">{t("product.shop_label")}:</span>{" "}
              {product.shop.shopName}
            </p>
            {product.category && (
              <p>
                <span className="font-medium text-gray-600">{t("product.category_label")}:</span>{" "}
                {product.category.nameVn}
              </p>
            )}
          </div>

          {/* Price display */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            {unitPrice != null ? (
              <p className="text-2xl font-bold text-primary">{formatCNY(unitPrice)}</p>
            ) : (
              <p className="text-lg font-semibold text-gray-700">
                {t("product.price_range", {
                  min: product.variants[0]?.priceCnyCurrent ?? 0,
                  max: product.variants[product.variants.length - 1]?.priceCnyCurrent ?? 0,
                })}
              </p>
            )}
            {selectedVariant && selectedVariant.priceTiers.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{t("product.volume_pricing")}</p>
            )}
          </div>

          {/* Variant selector */}
          {product.variants.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t("product.choose_variant")}</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isUnavailable = !variant.isAvailable;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => {
                        if (!isUnavailable) {
                          setSelectedVariant(variant);
                          setCartMsg(null);
                        }
                      }}
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

          {/* Volume pricing table */}
          {selectedVariant && selectedVariant.priceTiers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{t("product.volume_pricing")}</p>
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

          {/* Quantity + Add to cart */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-gray-700 w-20">{t("product.quantity_label")}</p>
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
              {unitPrice != null && quantity > 1 && (
                <span className="text-sm text-gray-500">
                  = {formatCNY(unitPrice * quantity)}
                </span>
              )}
            </div>

            {cartMsg && (
              <p
                className={cn(
                  "text-sm rounded-lg px-4 py-2",
                  cartMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                )}
              >
                {cartMsg.text}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                loading={addingToCart}
                onClick={handleAddToCart}
                disabled={product.isForbidden}
              >
                {addingToCart ? t("product.adding_to_cart") : t("product.add_to_cart")}
              </Button>
              {product.originalUrl && (
                <a
                  href={product.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("product.view_original_url")} ↗
                </a>
              )}
            </div>
          </div>

          {/* SEO description */}
          {product.seoDescription && (
            <div className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              {product.seoDescription}
            </div>
          )}
        </div>
      </div>

      {/* Attributes */}
      {product.attributes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-800 mb-3">{t("product.tab_attributes")}</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {product.attributes.map((attr, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 font-medium w-1/3">
                      {attr.keyVn ?? attr.keyCn ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800">
                      {attr.valueVn ?? attr.valueCn ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
