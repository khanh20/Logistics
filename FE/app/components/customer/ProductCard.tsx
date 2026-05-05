import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils/cn";
import { formatVND } from "~/lib/utils/format";
import type { ProductListItem } from "~/lib/types/product";

interface ProductCardProps {
  product: ProductListItem;
  className?: string;
}

const CNY_TO_VND_APPROX = 3500;

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation();

  const minVnd = product.minPriceCny * CNY_TO_VND_APPROX;

  return (
    <Link
      to={`/products/${product.slug}`}
      className={cn(
        "group flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
        "hover:shadow-md hover:border-gray-300 transition-all",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.primaryImageUrl ? (
          <img
            src={product.primaryImageUrl}
            alt={product.translatedTitle ?? product.originalTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-300 text-4xl">
            📦
          </div>
        )}

        {product.isForbidden && (
          <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
            <span className="text-white text-xs font-medium px-2 py-1 bg-red-700 rounded-full">
              {t("product.forbidden_warning").substring(0, 15)}…
            </span>
          </div>
        )}

        {product.isFeatured && !product.isForbidden && (
          <span className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Nổi bật
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3 flex-1">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {product.translatedTitle ?? product.originalTitle}
        </h3>

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>{product.platformName}</span>
          <span>·</span>
          <span className="truncate">{product.shopName}</span>
        </div>

        <div className="mt-auto pt-1.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{t("product.from_price", { price: "" })}</p>
            <p className="text-base font-bold text-primary">{formatVND(minVnd)}</p>
            <p className="text-xs text-gray-400">¥{product.minPriceCny.toFixed(2)}</p>
          </div>
          {product.variantCount > 1 && (
            <span className="text-xs text-gray-400">
              {t("product.variants", { count: product.variantCount })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
