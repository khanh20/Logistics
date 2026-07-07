import { useTranslation } from "react-i18next";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { SectionHeader, StatGroup, EmptyState } from "~/components/shared/Panels";
import { StatGroupSkeleton, SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { ChartLineUp, Clock } from "~/components/shared/icons";
import type { StaffKpiDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "KPI của tôi — MuaHo" }];
}

export default function StaffKpiPage() {
  const { t } = useTranslation();
  const { data: kpi, loading } = useFetch<StaffKpiDto>(
    () => staffPortalApi.getMyKpi().then((r) => r.data as StaffKpiDto),
    []
  );

  return (
    <FadeIn className="max-w-5xl space-y-6">
      <SectionHeader title={t("staff_kpi.title")} subtitle={kpi ? `${kpi.from} → ${kpi.to}` : undefined} />

      {loading && !kpi ? (
        <>
          <StatGroupSkeleton count={6} />
          <SkeletonPanel rows={6} cols={6} />
        </>
      ) : !kpi ? (
        <EmptyState icon={<ChartLineUp size={40} />} title={t("staff_kpi.no_data")} />
      ) : (
        <>
          <StatGroup
            items={[
              { label: t("staff_kpi.assigned"), value: kpi.ordersAssigned },
              { label: t("staff_kpi.completed"), value: kpi.ordersCompleted, accent: "success" },
              { label: t("staff_kpi.on_time"), value: kpi.onTimeCount, accent: "blue" },
              { label: t("staff_kpi.overdue"), value: kpi.overdueCount, accent: kpi.overdueCount > 0 ? "danger" : "default" },
              { label: t("staff_kpi.cancelled"), value: kpi.cancelledCount },
              { label: t("staff_kpi.on_time_rate"), value: `${Math.round(kpi.onTimeRate * 100)}%`, accent: "blue" },
            ]}
          />

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-4 text-sm text-slate-600">
            <Clock size={16} className="text-slate-400" />
            {t("staff_kpi.avg_handling")}: <b className="tabular-nums text-slate-900">{kpi.avgHandlingMinutes}</b> {t("staff_kpi.minutes")}
          </div>

          {kpi.series.length === 0 ? (
            <EmptyState icon={<ChartLineUp size={40} />} title={t("staff_kpi.no_data")} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {[
                      t("staff_kpi.date"), t("staff_kpi.assigned"), t("staff_kpi.completed"),
                      t("staff_kpi.on_time"), t("staff_kpi.overdue"), t("staff_kpi.avg_min"),
                    ].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[13px]">
                  {kpi.series.map((p) => (
                    <tr key={p.date} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">{p.date}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{p.ordersAssigned}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{p.ordersCompleted}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{p.onTimeCount}</td>
                      <td className={`px-4 py-2 tabular-nums ${p.overdueCount > 0 ? "text-red-600" : "text-slate-700"}`}>{p.overdueCount}</td>
                      <td className="px-4 py-2 tabular-nums text-slate-700">{p.avgHandlingMinutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </FadeIn>
  );
}
