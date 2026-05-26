import { cn } from "~/lib/utils/cn";
import { formatDate } from "~/lib/utils/format";
import { ORDER_STATUS_LABEL } from "~/lib/constants/orderStatus";
import type { OrderStatusHistoryResponse } from "~/lib/types/order";
import type { OrderStatus } from "~/lib/constants/orderStatus";

interface OrderTimelineProps {
  history: OrderStatusHistoryResponse[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Chưa có lịch sử trạng thái.</p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-6">
      {history.map((h, idx) => {
        const isFirst = idx === 0;
        const statusLabel =
          ORDER_STATUS_LABEL[h.toStatus as OrderStatus] ?? h.toStatus;

        return (
          <li key={idx} className="relative">
            {/* Dot */}
            <span
              className={cn(
                "absolute -left-[1.625rem] flex items-center justify-center",
                "w-5 h-5 rounded-full ring-4 ring-white",
                isFirst ? "bg-primary" : "bg-gray-300"
              )}
            >
              {isFirst && (
                <span className="w-2 h-2 rounded-full bg-white block" />
              )}
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isFirst ? "text-primary" : "text-gray-700"
                  )}
                >
                  {statusLabel}
                </p>
                {h.note && (
                  <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>
                )}
              </div>
              <time className="text-xs text-gray-400 shrink-0">
                {formatDate(h.changedAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
