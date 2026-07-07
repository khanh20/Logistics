import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { usersApi } from "~/lib/api/auth";
import { useFetch } from "~/lib/hooks/useFetch";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { WarningCircle, CheckCircle } from "~/components/shared/icons";
import { formatDate } from "~/lib/utils/format";
import { STAFF_ROLES } from "~/lib/constants/roles";
import type { StaffWorkloadDto, OverdueAssignmentDto } from "~/lib/types/order";
import type { StaffUserDto } from "~/lib/types/auth";

export function meta() {
  return [{ title: "Staff Dashboard — MuaHo Admin" }];
}

interface NamedWorkload extends StaffWorkloadDto {
  staffName: string;
}
interface DashboardData {
  overdueList: OverdueAssignmentDto[];
  workloads: NamedWorkload[];
}

async function loadDashboard(): Promise<DashboardData> {
  const overdueRes = await staffAssignmentsApi.getOverdue();
  const overdueList = (overdueRes.data as OverdueAssignmentDto[]) ?? [];

  let staff: StaffUserDto[] = [];
  try {
    const usersRes = await usersApi.getAll(1, 200);
    staff = ((usersRes.data?.data ?? []) as StaffUserDto[]).filter((u) =>
      u.roles.some((r) => STAFF_ROLES.includes(r as (typeof STAFF_ROLES)[number]))
    );
  } catch { /* ignore */ }

  const results = await Promise.allSettled(staff.map((s) => staffAssignmentsApi.getWorkload(s.id)));
  const workloads: NamedWorkload[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const wl = r.value.data as StaffWorkloadDto;
      if (wl.activeCount > 0 || wl.overdueCount > 0) workloads.push({ ...wl, staffName: staff[i].fullName });
    }
  });
  return { overdueList, workloads };
}

export default function StaffDashboardPage() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<DashboardData>(loadDashboard, []);
  const overdueList = data?.overdueList ?? [];
  const workloads = data?.workloads ?? [];

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);
  const [newStaffId, setNewStaffId] = useState("");

  async function handleReassign(orderId: string, orderCode: string) {
    if (!newStaffId.trim()) { setError(t("staff.error_staff_id_required")); return; }
    setBusy(true);
    setError(null);
    try {
      await staffAssignmentsApi.reassign(orderId, newStaffId.trim());
      setSuccess(t("staff.reassign_success", { code: orderCode }));
      setReassignOrderId(null);
      setNewStaffId("");
      reload();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("staff.reassign_error"));
    } finally {
      setBusy(false);
    }
  }

  const tableHeaders = [
    t("staff.col_order_code"), t("staff.col_staff_id"), t("staff.col_sla_deadline"),
    t("staff.col_overdue"), t("common.status"), "",
  ];

  return (
    <FadeIn className="max-w-5xl space-y-8">
      <SectionHeader title={t("staff.dashboard_title")} subtitle={t("staff.dashboard_subtitle")} />

      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      {/* Overdue */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-slate-800">
          {t("staff.overdue_section")}
          {overdueList.length > 0 && <Badge variant="error">{overdueList.length}</Badge>}
        </h2>

        {loading && !data ? (
          <SkeletonPanel rows={4} cols={6} />
        ) : overdueList.length === 0 ? (
          <EmptyState icon={<CheckCircle size={40} />} title={t("staff.no_overdue")} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {tableHeaders.map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.map((a) => (
                  <tr key={a.assignmentId} className="transition-colors hover:bg-red-50/40">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${a.orderId}`} className="font-mono text-sm font-medium text-primary hover:underline">{a.orderCode}</Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.staffName ?? `${a.staffId.slice(0, 8)}…`}</td>
                    <td className="px-4 py-3 tabular-nums text-sm text-slate-600">{formatDate(a.slaDeadline)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium tabular-nums text-red-700">
                        <WarningCircle size={12} weight="fill" />
                        {t("staff.overdue_duration", { h: Math.floor(a.overdueByMinutes / 60), m: a.overdueByMinutes % 60 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.orderStatus}</td>
                    <td className="px-4 py-3">
                      {reassignOrderId === a.orderId ? (
                        <div className="flex items-center gap-2">
                          <input value={newStaffId} onChange={(e) => setNewStaffId(e.target.value)} placeholder={t("staff.staff_uuid_placeholder")} className="w-48 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          <Button size="sm" loading={busy} onClick={() => handleReassign(a.orderId, a.orderCode)}>{t("staff.confirm_reassign")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReassignOrderId(null)}>{t("common.cancel")}</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => { setReassignOrderId(a.orderId); setNewStaffId(""); }}>{t("staff.reassign_btn")}</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Workload */}
      {workloads.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-800">{t("staff.workload_section")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workloads.map((w) => (
              <div key={w.staffId} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-800">{w.staffName}</p>
                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">{w.activeCount}</p>
                    <p className="text-xs text-slate-500">{t("staff.active_orders")}</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold tabular-nums ${w.overdueCount > 0 ? "text-red-600" : "text-slate-900"}`}>{w.overdueCount}</p>
                    <p className="text-xs text-slate-500">{t("staff.overdue_label")}</p>
                  </div>
                </div>
                {w.assignments.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-slate-500">{t("staff.nearest_deadline")}</p>
                    <SlaCountdown deadline={w.assignments[0].slaDeadline} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </FadeIn>
  );
}
