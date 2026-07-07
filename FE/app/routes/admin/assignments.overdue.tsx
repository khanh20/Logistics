import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { WarningCircle, CheckCircle, ArrowLeft } from "~/components/shared/icons";
import { formatDate } from "~/lib/utils/format";
import type { OverdueAssignmentDto } from "~/lib/types/order";

export function meta() {
  return [{ title: "Overdue SLA — MuaHo Admin" }];
}

export default function OverdueAssignmentsPage() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<OverdueAssignmentDto[]>(
    () => staffAssignmentsApi.getOverdue().then((r) => (r.data as OverdueAssignmentDto[]) ?? []),
    []
  );
  const list = data ?? [];

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reassignOrderId, setReassignOrderId] = useState<string | null>(null);
  const [newStaffId, setNewStaffId] = useState("");

  async function handleReassign(item: OverdueAssignmentDto) {
    if (!newStaffId.trim()) { setError(t("staff.error_staff_id_required")); return; }
    setBusy(true);
    setError(null);
    try {
      await staffAssignmentsApi.reassign(item.orderId, newStaffId.trim(), t("staff.reassign_btn"));
      setSuccess(t("staff.reassign_success_full", { code: item.orderCode }));
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
    t("staff.col_order_code"), t("staff.col_staff_in_charge"), t("staff.col_sla_deadline"),
    t("staff.col_overdue"), t("common.status"), t("common.actions"),
  ];

  return (
    <FadeIn className="max-w-5xl space-y-6">
      <SectionHeader
        title={t("staff.overdue_title")}
        subtitle={t("staff.overdue_count", { count: list.length })}
        action={
          <Link to="/admin/staff-dashboard" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft size={15} /> {t("staff.back_to_dashboard")}
          </Link>
        }
      />

      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      {loading && !data ? (
        <SkeletonPanel rows={5} cols={6} />
      ) : list.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} />} title={t("staff.no_overdue")} hint={t("staff.no_overdue_subtitle")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {tableHeaders.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((item) => (
                <tr key={item.assignmentId} className="align-top transition-colors hover:bg-red-50/40">
                  <td className="px-4 py-4">
                    <Link to={`/admin/orders/${item.orderId}`} className="font-mono text-sm font-semibold text-primary hover:underline">{item.orderCode}</Link>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">{item.staffName ?? `${item.staffId.slice(0, 8)}…`}</td>
                  <td className="px-4 py-4 tabular-nums text-sm text-slate-600">{formatDate(item.slaDeadline)}</td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-red-700">
                      <WarningCircle size={12} weight="fill" />
                      {t("staff.overdue_duration", { h: Math.floor(item.overdueByMinutes / 60), m: item.overdueByMinutes % 60 })}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{item.orderStatus}</td>
                  <td className="px-4 py-4">
                    {reassignOrderId === item.orderId ? (
                      <div className="flex flex-col gap-2">
                        <input value={newStaffId} onChange={(e) => setNewStaffId(e.target.value)} placeholder={t("staff.new_staff_placeholder")} className="w-56 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        <div className="flex gap-2">
                          <Button size="sm" loading={busy} onClick={() => handleReassign(item)}>{t("staff.confirm_reassign")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setReassignOrderId(null)}>{t("common.cancel")}</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => { setReassignOrderId(item.orderId); setNewStaffId(""); }}>{t("staff.reassign_btn")}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FadeIn>
  );
}
