import { cn } from "~/lib/utils/cn";
import {
  MISSING_CLAIM_STATUS_LABEL,
  MISSING_CLAIM_STATUS_COLOR,
  INSURANCE_CLAIM_STATUS_LABEL,
  INSURANCE_CLAIM_STATUS_COLOR,
} from "~/lib/constants/logistics";
import type {
  MissingClaimStatus,
  InsuranceClaimStatus,
} from "~/lib/types/logistics";

const base =
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";

export function MissingClaimStatusBadge({ status }: { status: string }) {
  const label =
    MISSING_CLAIM_STATUS_LABEL[status as MissingClaimStatus] ?? status;
  const color =
    MISSING_CLAIM_STATUS_COLOR[status as MissingClaimStatus] ??
    "bg-gray-100 text-gray-700";
  return <span className={cn(base, color)}>{label}</span>;
}

export function InsuranceClaimStatusBadge({ status }: { status: string }) {
  const label =
    INSURANCE_CLAIM_STATUS_LABEL[status as InsuranceClaimStatus] ?? status;
  const color =
    INSURANCE_CLAIM_STATUS_COLOR[status as InsuranceClaimStatus] ??
    "bg-gray-100 text-gray-700";
  return <span className={cn(base, color)}>{label}</span>;
}
