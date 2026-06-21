import { useTranslation } from "react-i18next";
import { staffOpsAdminApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { ChartLineUp } from "~/components/shared/icons";
import type { StaffKpiDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "KPI nhân viên — MuaHo Admin" }];
}

export default function AdminStaffKpiPage() {
  const { t } = useTranslation();
  const { data, loading } = useFetch<StaffKpiDto[]>(
    () => staffOpsAdminApi.getTeamKpi().then((r) => (r.data as StaffKpiDto[]) ?? []),
    []
  );
  const team = data ?? [];

  return (
    <FadeIn className="max-w-6xl space-y-5">
      <SectionHeader title={t("staff_kpi.team_title")} subtitle={t("staff_kpi.team_subtitle")} />

      {loading && !data ? (
        <SkeletonPanel rows={6} cols={8} />
      ) : team.length === 0 ? (
        <EmptyState icon={<ChartLineUp size={40} />} title={t("staff_kpi.no_data")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {[
                  t("staff_kpi.staff"), t("staff_kpi.assigned"), t("staff_kpi.completed"), t("staff_kpi.on_time"),
                  t("staff_kpi.overdue"), t("staff_kpi.cancelled"), t("staff_kpi.on_time_rate"), t("staff_kpi.avg_min"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.map((k) => (
                <tr key={k.staffId} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-medium text-slate-900">{k.staffName ?? `${k.staffId.slice(0, 8)}…`}</p></td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{k.ordersAssigned}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700">{k.ordersCompleted}</td>
                  <td className="px-4 py-3 tabular-nums text-blue-700">{k.onTimeCount}</td>
                  <td className={`px-4 py-3 tabular-nums ${k.overdueCount > 0 ? "text-red-600" : "text-slate-700"}`}>{k.overdueCount}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{k.cancelledCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(k.onTimeRate * 100)}%` }} />
                      </div>
                      <span className="tabular-nums font-medium text-slate-800">{Math.round(k.onTimeRate * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{k.avgHandlingMinutes}p</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FadeIn>
  );
}
