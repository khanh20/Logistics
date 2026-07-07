import { useState } from "react";
import { useTranslation } from "react-i18next";
import { staffOpsAdminApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { Modal } from "~/components/ui/Modal";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Gear, CheckCircle } from "~/components/shared/icons";
import { formatRelative } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { StaffWorkSettingDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Cấu hình nhân viên — MuaHo Admin" }];
}

export default function AdminStaffSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<StaffWorkSettingDto[]>(
    () => staffOpsAdminApi.getAllSettings().then((r) => (r.data as StaffWorkSettingDto[]) ?? []),
    []
  );
  const settings = data ?? [];

  const [edit, setEdit] = useState<StaffWorkSettingDto | null>(null);
  const [form, setForm] = useState({ maxConcurrentOrders: 10, autoAssignEnabled: true, isAvailable: true, shiftStartLocal: "", shiftEndLocal: "" });
  const [submitting, setSubmitting] = useState(false);

  function openEdit(s: StaffWorkSettingDto) {
    setEdit(s);
    setForm({
      maxConcurrentOrders: s.maxConcurrentOrders,
      autoAssignEnabled: s.autoAssignEnabled,
      isAvailable: s.isAvailable,
      shiftStartLocal: s.shiftStartLocal ?? "",
      shiftEndLocal: s.shiftEndLocal ?? "",
    });
  }

  async function save() {
    if (!edit) return;
    setSubmitting(true);
    try {
      await staffOpsAdminApi.updateSetting(edit.staffId, {
        isAvailable: form.isAvailable,
        autoAssignEnabled: form.autoAssignEnabled,
        maxConcurrentOrders: form.maxConcurrentOrders,
        shiftStartLocal: form.shiftStartLocal || null,
        shiftEndLocal: form.shiftEndLocal || null,
      });
      setEdit(null);
      reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FadeIn className="max-w-6xl space-y-5">
      <SectionHeader title={t("staff_settings.title")} subtitle={t("staff_settings.subtitle")} />

      {loading && !data ? (
        <SkeletonPanel rows={6} cols={7} />
      ) : settings.length === 0 ? (
        <EmptyState icon={<Gear size={40} />} title={t("staff_settings.empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {[
                  t("staff_settings.staff"), t("staff_settings.status"), t("staff_settings.auto"),
                  t("staff_settings.load"), t("staff_settings.shift"), t("staff_settings.last_active"), "",
                ].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.map((s) => (
                <tr key={s.staffId} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{s.staffName ?? `${s.staffId.slice(0, 8)}…`}</p>
                    <p className="text-xs text-slate-400">{s.staffEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", s.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.isAvailable ? "bg-emerald-500" : "bg-slate-400")} />
                      {s.isAvailable ? t("staff_portal.online") : t("staff_portal.offline")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {s.autoAssignEnabled ? <CheckCircle size={18} weight="fill" className="text-emerald-500" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{s.activeLoad} / {s.maxConcurrentOrders}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{s.shiftStartLocal && s.shiftEndLocal ? `${s.shiftStartLocal}–${s.shiftEndLocal}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.lastActiveAt ? formatRelative(s.lastActiveAt) : "—"}</td>
                  <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => openEdit(s)}>{t("common.edit")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} maxWidth="md" title={edit ? (edit.staffName ?? edit.staffId.slice(0, 8)) : undefined}>
        {edit && (
          <div className="space-y-4">
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{t("staff_settings.available")}</span>
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{t("staff_settings.auto_assign")}</span>
              <input type="checkbox" checked={form.autoAssignEnabled} onChange={(e) => setForm({ ...form, autoAssignEnabled: e.target.checked })} className="h-4 w-4 accent-primary" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-700">{t("staff_settings.max_concurrent")}</span>
              <input type="number" min={1} max={100} value={form.maxConcurrentOrders} onChange={(e) => setForm({ ...form, maxConcurrentOrders: Number(e.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2 tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </label>
            <div className="flex gap-2">
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-slate-700">{t("staff_settings.shift_start")}</span>
                <input type="time" value={form.shiftStartLocal} onChange={(e) => setForm({ ...form, shiftStartLocal: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-slate-700">{t("staff_settings.shift_end")}</span>
                <input type="time" value={form.shiftEndLocal} onChange={(e) => setForm({ ...form, shiftEndLocal: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setEdit(null)}>{t("common.cancel")}</Button>
              <Button loading={submitting} onClick={save}>{t("common.save")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </FadeIn>
  );
}
