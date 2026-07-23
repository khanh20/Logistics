import type { ComponentType } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import type { IconProps } from "@phosphor-icons/react";
import { cn } from "~/lib/utils/cn";
import { ROLES } from "~/lib/constants/roles";
import {
  House,
  ListChecks,
  ChartLineUp,
  ChatCircleDots,
  Bell,
  Wrench,
  StarIcon,
} from "~/components/shared/icons";
import type { UserAuthInfo } from "~/lib/types/auth";

interface StaffSidebarProps {
  user: UserAuthInfo;
  unreadCount?: number;
}

interface Item {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  roles?: string[]; // nếu set, chỉ hiện cho role này (Admin luôn thấy)
  badge?: number;
}

export function StaffSidebar({ user, unreadCount = 0 }: StaffSidebarProps) {
  const { t } = useTranslation();
  const roles = user.roles;

  const items: Item[] = [
    { to: "/staff",               label: t("staff_portal.nav_overview"),      icon: House },
    { to: "/staff/assignments",   label: t("staff_portal.nav_assignments"),   icon: ListChecks,     roles: [ROLES.NV_MUA_HANG] },
    { to: "/staff/kpi",           label: t("staff_portal.nav_kpi"),           icon: ChartLineUp,    roles: [ROLES.NV_MUA_HANG] },
    { to: "/staff/complaints",    label: t("staff_portal.nav_complaints"),    icon: ChatCircleDots, roles: [ROLES.NV_CSKH] },
    { to: "/staff/reviews",       label: t("staff_portal.nav_reviews"),       icon: StarIcon,       roles: [ROLES.NV_CSKH, ROLES.NV_MUA_HANG] },
    { to: "/staff/notifications", label: t("staff_portal.nav_notifications"), icon: Bell, badge: unreadCount },
  ];

  const visible = items.filter(
    (i) => !i.roles || roles.includes(ROLES.ADMIN) || i.roles.some((r) => roles.includes(r))
  );

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
        <span className="font-heading text-lg font-bold tracking-tight text-white">MuaHo</span>
        <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {t("staff_portal.badge")}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {visible.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/staff"}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                "active:scale-[0.98]",
                isActive
                  ? "bg-primary font-medium text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-2.5">
                  <Icon size={18} weight={isActive ? "fill" : "regular"} />
                  {label}
                </span>
                {badge ? (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}

        <NavLink
          to="/admin"
          className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white active:scale-[0.98]"
        >
          <Wrench size={18} />
          {t("staff_portal.nav_admin")}
        </NavLink>
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <p className="truncate text-sm font-medium text-slate-200">{user.fullName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span key={r} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
              {r}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
