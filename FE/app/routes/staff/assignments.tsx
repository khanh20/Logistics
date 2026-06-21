import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { Badge, type BadgeVariant } from "~/components/ui/Badge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { CheckCircle, PlayCircle, CheckSquare, ArrowRight, Tray, WarningCircle } from "~/components/shared/icons";
import { formatVND } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { StaffQueueItemDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Hàng đợi của tôi — MuaHo" }];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Assigned: "warning", Accepted: "info", InProgress: "info",
  Done: "success", Reassigned: "default", Cancelled: "error",
};

export default function StaffAssignmentsPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useFetch<StaffQueueItemDto[]>(
    () => staffPortalApi.getMyQueue(false).then((r) => (r.data as StaffQueueItemDto[]) ?? []),
    []
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const queue = data ?? [];

  async function act(id: string, action: "accept" | "start" | "complete") {
    setBusyId(id);
    setActionError(null);
    try {
      await staffPortalApi[action](id);
      reload();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FadeIn className="max-w-6xl space-y-5">
      <SectionHeader title={t("staff_portal.queue_title")} subtitle={t("staff_portal.queue_subtitle")} />

      {(actionError || error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError ?? error}</div>
      )}

      {loading && !data ? (
        <SkeletonPanel rows={6} cols={5} />
      ) : queue.length === 0 ? (
        <EmptyState icon={<Tray size={40} />} title={t("staff_portal.queue_empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {[
                  t("staff_portal.col_order"),
                  t("staff_portal.col_amount"),
                  t("staff_portal.col_assign_status"),
                  t("staff_portal.col_sla"),
                  t("staff_portal.col_actions"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((a) => {
                const busy = busyId === a.assignmentId;
                return (
                  <tr key={a.assignmentId} className={cn("transition-colors hover:bg-slate-50", a.isOverdue && "bg-red-50/40")}>
                    <td className="px-4 py-3">
                      <Link to={`/staff/assignments/${a.assignmentId}`} className="font-mono text-sm font-medium text-primary hover:underline">
                        {a.orderCode}
                      </Link>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        {a.isOverdue && <WarningCircle size={12} weight="fill" className="text-red-400" />}
                        {a.orderStatusLabel} · {a.itemCount} {t("staff_portal.items")}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{formatVND(a.finalAmountVnd)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[a.assignmentStatus] ?? "default"}>{a.assignmentStatus}</Badge>
                    </td>
                    <td className="px-4 py-3"><SlaCountdown deadline={a.slaDeadline} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.assignmentStatus === "Assigned" && (
                          <Button size="sm" loading={busy} onClick={() => act(a.assignmentId, "accept")}>
                            <CheckCircle size={16} weight="bold" />{t("staff_portal.accept")}
                          </Button>
                        )}
                        {a.assignmentStatus === "Accepted" && (
                          <Button size="sm" loading={busy} onClick={() => act(a.assignmentId, "start")}>
                            <PlayCircle size={16} weight="bold" />{t("staff_portal.start")}
                          </Button>
                        )}
                        {(a.assignmentStatus === "InProgress" || a.assignmentStatus === "Accepted") && (
                          <Button size="sm" variant="secondary" loading={busy} onClick={() => act(a.assignmentId, "complete")}>
                            <CheckSquare size={16} weight="bold" />{t("staff_portal.complete")}
                          </Button>
                        )}
                        <Link to={`/admin/orders/${a.orderId}`}>
                          <Button size="sm" variant="ghost">{t("staff_portal.process")}<ArrowRight size={15} /></Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </FadeIn>
  );
}
