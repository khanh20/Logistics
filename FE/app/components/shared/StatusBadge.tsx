import { cn } from "~/lib/utils/cn";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, type OrderStatus } from "~/lib/constants/orderStatus";

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABEL[status as OrderStatus] ?? status;
  const color  = ORDER_STATUS_COLOR[status as OrderStatus] ?? "bg-gray-100 text-gray-700";

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", color)}>
      {label}
    </span>
  );
}
