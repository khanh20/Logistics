import { Steps } from "antd";
import {
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
} from "~/lib/constants/logistics";
import type { ContainerTripStatus } from "~/lib/types/logistics";

// Hiển thị tiến trình chuyến container: Loading → Departed → Border → ArrivedVn.
export function StatusStepper({ status }: { status: ContainerTripStatus }) {
  const current = TRIP_STATUSES.indexOf(status);
  return (
    <Steps
      size="small"
      current={current < 0 ? 0 : current}
      items={TRIP_STATUSES.map((s) => ({ title: TRIP_STATUS_LABEL[s] }))}
    />
  );
}
