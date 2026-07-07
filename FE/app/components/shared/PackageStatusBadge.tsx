import { cn } from "~/lib/utils/cn";
import {
  PACKAGE_STATUS_LABEL,
  PACKAGE_STATUS_COLOR,
} from "~/lib/constants/logistics";
import type { PackageStatus } from "~/lib/types/logistics";

export function PackageStatusBadge({ status }: { status: string }) {
  const label = PACKAGE_STATUS_LABEL[status as PackageStatus] ?? status;
  const color =
    PACKAGE_STATUS_COLOR[status as PackageStatus] ?? "bg-gray-100 text-gray-700";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        color
      )}
    >
      {label}
    </span>
  );
}
