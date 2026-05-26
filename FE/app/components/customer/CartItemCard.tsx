import { cn } from "~/lib/utils/cn";
import { formatCNY } from "~/lib/utils/format";
import { Button } from "~/components/ui/Button";
import type { CartItemResponse } from "~/lib/types/cart";

interface CartItemCardProps {
  item: CartItemResponse;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  disabled?: boolean;
}

export function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  disabled,
}: CartItemCardProps) {
  return (
    <div className="flex items-start gap-4 py-4">
      {/* Thumbnail */}
      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.productTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
            📦
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-2">
          {item.productTitle}
        </p>
        {item.variantName && (
          <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {formatCNY(item.priceCnySnapshot)} / cái
        </p>
      </div>

      {/* Quantity control */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={disabled || item.quantity <= 1}
          className={cn(
            "w-7 h-7 rounded-lg border border-gray-300 text-gray-600",
            "flex items-center justify-center font-bold text-sm transition-colors",
            "hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium text-gray-900">
          {item.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={disabled || item.quantity >= 999}
          className={cn(
            "w-7 h-7 rounded-lg border border-gray-300 text-gray-600",
            "flex items-center justify-center font-bold text-sm transition-colors",
            "hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          +
        </button>
      </div>

      {/* Line total */}
      <div className="text-right shrink-0 min-w-[72px]">
        <p className="text-sm font-semibold text-primary">
          {formatCNY(item.lineTotalCny)}
        </p>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(item.id)}
        disabled={disabled}
        className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
        title="Xóa"
      >
        🗑
      </button>
    </div>
  );
}
