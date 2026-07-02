import { cn } from "~/lib/utils/cn";
import {
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_COLOR,
  WAYBILL_STATUS_LABEL,
  WAYBILL_STATUS_COLOR,
} from "~/lib/constants/logistics";
import type {
  DeliveryRequestStatus,
  WaybillStatus,
} from "~/lib/types/logistics";

const base =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

export function DeliveryStatusBadge({ status }: { status: string }) {
  const label = DELIVERY_STATUS_LABEL[status as DeliveryRequestStatus] ?? status;
  const color =
    DELIVERY_STATUS_COLOR[status as DeliveryRequestStatus] ??
    "bg-gray-100 text-gray-700";
  return <span className={cn(base, color)}>{label}</span>;
}

export function WaybillStatusBadge({ status }: { status: string }) {
  const label = WAYBILL_STATUS_LABEL[status as WaybillStatus] ?? status;
  const color =
    WAYBILL_STATUS_COLOR[status as WaybillStatus] ?? "bg-gray-100 text-gray-700";
  return <span className={cn(base, color)}>{label}</span>;
}
