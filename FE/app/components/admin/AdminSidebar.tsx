import { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils/cn";
import type { UserAuthInfo } from "~/lib/types/auth";

interface AdminSidebarProps {
  user: UserAuthInfo;
}

interface MenuItem {
  to: string;
  label: string;
  icon: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  items: MenuItem[];
}

const STORAGE_KEY = "admin-sidebar-open";

function loadOpenGroups(groupIds: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed);
    }
  } catch {
    // ignore parse errors
  }
  // Default: all groups open
  return new Set(groupIds);
}

function saveOpenGroups(open: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...open]));
  } catch {
    // ignore storage errors
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const { t } = useTranslation();

  const GROUPS: MenuGroup[] = [
    {
      id: "orders",
      label: t("nav.group_orders"),
      icon: "📦",
      items: [
        { to: "/admin/orders",          label: t("nav.orders"),          icon: "📋" },
        { to: "/admin/platform-orders", label: t("nav.platform_orders"), icon: "🛍️" },
      ],
    },
    {
      id: "staff",
      label: t("nav.group_staff"),
      icon: "👥",
      items: [
        { to: "/admin/staff-dashboard",     label: t("nav.staff_dashboard"), icon: "📊" },
        { to: "/admin/assignments/overdue", label: t("nav.overdue_sla"),     icon: "⚠️" },
        { to: "/admin/staff",              label: t("nav.staff"),           icon: "👤" },
      ],
    },
    {
      id: "products",
      label: t("nav.group_products"),
      icon: "🏷️",
      items: [
        { to: "/admin/products",    label: t("nav.products"),    icon: "📦" },
        { to: "/admin/categories",  label: t("nav.categories"),  icon: "📂" },
        { to: "/admin/platforms",   label: t("nav.platforms"),   icon: "🌐" },
        { to: "/admin/ingestion",   label: t("nav.ingestion"),   icon: "⬇️" },
      ],
    },
    {
      id: "system",
      label: t("nav.group_system"),
      icon: "⚙️",
      items: [
        { to: "/admin/exchange-rates", label: t("nav.exchange_rates"), icon: "💱" },
        { to: "/admin/roles",          label: t("nav.roles"),          icon: "🔐" },
        { to: "/admin/permissions",    label: t("nav.permissions"),    icon: "🗝️" },
      ],
    },
  ];

  const allGroupIds = GROUPS.map((g) => g.id);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    loadOpenGroups(allGroupIds)
  );

  // Keep localStorage in sync whenever openGroups changes
  useEffect(() => {
    saveOpenGroups(openGroups);
  }, [openGroups]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <aside className="w-60 shrink-0 bg-gray-900 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
        <span className="text-lg font-bold text-white">MuaHo</span>
        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">
          Admin
        </span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">
        {GROUPS.map((group) => {
          const isOpen = openGroups.has(group.id);
          return (
            <div key={group.id}>
              {/* Group header — click to collapse / expand */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md
                           text-xs font-semibold uppercase tracking-wider
                           text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <span>{group.icon}</span>
                  {group.label}
                </span>
                <span
                  className={cn(
                    "transition-transform duration-200 text-gray-600",
                    isOpen ? "rotate-90" : "rotate-0"
                  )}
                >
                  ›
                </span>
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="mt-0.5 mb-1 space-y-0.5 pl-2">
                  {group.items.map(({ to, label, icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary text-white font-medium"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        )
                      }
                    >
                      <span className="text-base leading-none">{icon}</span>
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info footer */}
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <p className="text-sm text-gray-200 font-medium truncate">{user.fullName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span
              key={r}
              className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
            >
              {r}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
