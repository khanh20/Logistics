import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { SectionHeader, StatGroup } from "~/components/shared/Panels";
import { StatGroupSkeleton } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Power, Pause, ArrowRight, Storefront, Clock } from "~/components/shared/icons";
import type { StaffWorkSettingDto, StaffKpiDto, StaffQueueItemDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Cổng nhân viên — MuaHo" }];
}

interface OverviewData {
  workSetting: StaffWorkSettingDto | null;
  kpi: StaffKpiDto | null;
  queue: StaffQueueItemDto[];
}

async function loadOverview(): Promise<OverviewData> {
  const [wsRes, kpiRes, queueRes] = await Promise.allSettled([
    staffPortalApi.getMyWorkSetting(),
    staffPortalApi.getMyKpi(),
    staffPortalApi.getMyQueue(false),
  ]);
  return {
    workSetting: wsRes.status === "fulfilled" ? (wsRes.value.data as StaffWorkSettingDto) : null,
    kpi: kpiRes.status === "fulfilled" ? (kpiRes.value.data as StaffKpiDto) : null,
    queue: queueRes.status === "fulfilled" ? (queueRes.value.data as StaffQueueItemDto[]) : [],
  };
}

export default function StaffOverviewPage() {
  const { t } = useTranslation();
  const { data, loading, setData } = useFetch<OverviewData>(loadOverview, []);
  const [busy, setBusy] = useState(false);

  const ws = data?.workSetting ?? null;
  const kpi = data?.kpi ?? null;
  const queue = data?.queue ?? [];
  const openCount = queue.filter((q) => !q.completedAt).length;
  const overdueOpen = queue.filter((q) => q.isOverdue && !q.completedAt).length;

  async function toggleOnline() {
    if (!ws) return;
    setBusy(true);
    try {
      const res = await staffPortalApi.setAvailability(!ws.isAvailable);
      const next = res.data as StaffWorkSettingDto;
      setData((prev) => ({ ...(prev as OverviewData), workSetting: next }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FadeIn className="max-w-5xl space-y-6">
      <SectionHeader
        title={t("staff_portal.overview_title")}
        subtitle={t("staff_portal.overview_subtitle")}
        action={
          ws && (
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  ws.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {ws.isAvailable && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${ws.isAvailable ? "bg-emerald-500" : "bg-slate-400"}`} />
                </span>
                {ws.isAvailable ? t("staff_portal.online") : t("staff_portal.offline")}
              </span>
              <Button size="sm" variant={ws.isAvailable ? "ghost" : "primary"} loading={busy} onClick={toggleOnline}>
                {ws.isAvailable ? <Pause size={16} weight="fill" /> : <Power size={16} weight="bold" />}
                {ws.isAvailable ? t("staff_portal.go_offline") : t("staff_portal.go_online")}
              </Button>
            </div>
          )
        }
      />

      {loading && !data ? (
        <StatGroupSkeleton count={4} />
      ) : (
        <StatGroup
          items={[
            { label: t("staff_portal.open_orders"), value: openCount, accent: "primary" },
            { label: t("staff_portal.overdue"), value: overdueOpen, accent: overdueOpen > 0 ? "danger" : "default" },
            { label: t("staff_kpi.completed"), value: kpi?.ordersCompleted ?? 0 },
            { label: t("staff_kpi.on_time_rate"), value: kpi ? `${Math.round(kpi.onTimeRate * 100)}%` : "—", accent: "blue" },
          ]}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/staff/assignments">
          <Button variant="secondary">
            {t("staff_portal.nav_assignments")}
            <ArrowRight size={16} />
          </Button>
        </Link>
        <Link to="/staff/kpi">
          <Button variant="ghost">
            {t("staff_portal.nav_kpi")}
            <ArrowRight size={16} />
          </Button>
        </Link>
      </div>

      {ws && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Storefront size={16} className="text-slate-400" />
            {t("staff_portal.capacity")}: <b className="tabular-nums text-slate-900">{ws.activeLoad}</b> / {ws.maxConcurrentOrders}
          </span>
          {ws.shiftStartLocal && ws.shiftEndLocal && (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={16} className="text-slate-400" />
              {t("staff_portal.shift")}: {ws.shiftStartLocal}–{ws.shiftEndLocal}
            </span>
          )}
        </div>
      )}
    </FadeIn>
  );
}
