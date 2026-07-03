import type { ComponentType } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { IconProps } from "@phosphor-icons/react";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonCards } from "~/components/shared/Skeleton";
import { Stagger, StaggerItem } from "~/components/shared/Motion";
import { Package, Hourglass, WarningCircle, ChatCircleDots, Bell, ArrowRight } from "~/components/shared/icons";
import { formatRelative } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { StaffNotificationDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Thông báo — MuaHo" }];
}

const ICON: Record<string, ComponentType<IconProps>> = {
  OrderAssigned: Package, SlaWarning: Hourglass, SlaOverdue: WarningCircle,
  ComplaintAssigned: ChatCircleDots, System: Bell,
};
const ICON_TONE: Record<string, string> = {
  OrderAssigned: "text-primary", SlaWarning: "text-amber-500", SlaOverdue: "text-red-500",
  ComplaintAssigned: "text-blue-500", System: "text-slate-400",
};

export default function StaffNotificationsPage() {
  const { t } = useTranslation();
  const { data, loading, reload } = useFetch<StaffNotificationDto[]>(
    () => staffPortalApi.getNotifications(false).then((r) => (r.data as StaffNotificationDto[]) ?? []),
    []
  );
  const items = data ?? [];

  async function markRead(id: string) { await staffPortalApi.markRead(id); reload(); }
  async function markAll() { await staffPortalApi.markAllRead(); reload(); }

  return (
    <div className="max-w-3xl space-y-4">
      <SectionHeader
        title={t("staff_portal.nav_notifications")}
        action={items.some((n) => !n.isRead) ? <Button size="sm" variant="ghost" onClick={markAll}>{t("staff_portal.mark_all_read")}</Button> : undefined}
      />

      {loading && !data ? (
        <SkeletonCards count={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} title={t("staff_portal.no_notifications")} />
      ) : (
        <Stagger className="space-y-2">
          {items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <StaggerItem key={n.id}>
                <div className={cn(
                  "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors",
                  n.isRead ? "border-slate-200/70" : "border-primary/30 bg-primary-light/40"
                )}>
                  <Icon size={22} weight="duotone" className={cn("mt-0.5 shrink-0", ICON_TONE[n.type] ?? "text-slate-400")} />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatRelative(n.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {n.refOrderId && (
                      <Link to={`/staff/orders/${n.refOrderId}`} className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                        {t("staff_portal.view_order")} <ArrowRight size={12} />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="text-xs text-slate-400 transition-colors hover:text-slate-700">
                        {t("staff_portal.mark_read")}
                      </button>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
