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

  // Tự đặt ca làm (edit shift).
  const [editShift, setEditShift] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState("");
  const [autoAssign, setAutoAssign] = useState(false);
  const [shiftErr, setShiftErr] = useState<string | null>(null);

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

  function openEditShift() {
    if (!ws) return;
    setShiftStart(ws.shiftStartLocal?.slice(0, 5) ?? "");
    setShiftEnd(ws.shiftEndLocal?.slice(0, 5) ?? "");
    setMaxConcurrent(String(ws.maxConcurrentOrders ?? 0));
    setAutoAssign(ws.autoAssignEnabled ?? false);
    setShiftErr(null);
    setEditShift(true);
  }

  async function saveShift() {
    if (!ws) return;
    // Nếu nhập ca thì phải đủ 2 mốc và giờ bắt đầu < giờ kết thúc.
    if ((shiftStart && !shiftEnd) || (!shiftStart && shiftEnd)) {
      setShiftErr(t("staff_portal.err_shift_both", "Nhập cả giờ bắt đầu và kết thúc"));
      return;
    }
    if (shiftStart && shiftEnd && shiftStart >= shiftEnd) {
      setShiftErr(t("staff_portal.err_shift_order", "Giờ bắt đầu phải trước giờ kết thúc"));
      return;
    }
    const max = parseInt(maxConcurrent);
    if (Number.isNaN(max) || max < 1 || max > 100) {
      setShiftErr(t("staff_portal.err_max_range", "Số đơn tối đa phải từ 1–100"));
      return;
    }
    setShiftErr(null);
    setSavingShift(true);
    try {
      const res = await staffPortalApi.updateMyWorkSetting({
        isAvailable: ws.isAvailable,
        autoAssignEnabled: autoAssign,
        maxConcurrentOrders: max,
        shiftStartLocal: shiftStart || null,
        shiftEndLocal: shiftEnd || null,
      });
      const next = res.data as StaffWorkSettingDto;
      setData((prev) => ({ ...(prev as OverviewData), workSetting: next }));
      setEditShift(false);
    } catch (e: unknown) {
      setShiftErr((e as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSavingShift(false);
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
        <div className="rounded-2xl border border-slate-200/70 bg-white px-5 py-4 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
            {!editShift && (
              <Button size="sm" variant="ghost" className="ml-auto" onClick={openEditShift}>
                {t("staff_portal.edit_shift", "Sửa ca làm")}
              </Button>
            )}
          </div>

          {editShift && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-0.5 block text-[11px] text-slate-500">{t("staff_portal.shift_start", "Giờ bắt đầu")}</span>
                  <input type="time" value={shiftStart} onChange={(e) => { setShiftStart(e.target.value); setShiftErr(null); }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[11px] text-slate-500">{t("staff_portal.shift_end", "Giờ kết thúc")}</span>
                  <input type="time" value={shiftEnd} onChange={(e) => { setShiftEnd(e.target.value); setShiftErr(null); }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-[11px] text-slate-500">{t("staff_portal.max_concurrent", "Số đơn tối đa cùng lúc")}</span>
                  <input type="number" min="1" max="100" value={maxConcurrent} onChange={(e) => { setMaxConcurrent(e.target.value); setShiftErr(null); }} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary" />
                </label>
                <label className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} className="size-4 rounded border-slate-300" />
                  <span className="text-sm text-slate-700">{t("staff_portal.auto_assign", "Nhận đơn tự động")}</span>
                </label>
              </div>
              {shiftErr && <p className="text-xs text-red-500">{shiftErr}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditShift(false)}>{t("common.cancel", "Hủy")}</Button>
                <Button size="sm" loading={savingShift} onClick={saveShift}>{t("common.save", "Lưu")}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </FadeIn>
  );
}
