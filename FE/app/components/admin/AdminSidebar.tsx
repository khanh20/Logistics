import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils/cn";
import type { UserAuthInfo } from "~/lib/types/auth";

interface AdminSidebarProps {
  user: UserAuthInfo;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const { t } = useTranslation();

  const MENU_ITEMS = [
    { to: "/admin/orders",          label: t("nav.orders"),          icon: "📦" },
    { to: "/admin/platform-orders", label: t("nav.platform_orders"), icon: "🛍️" },
    { to: "/admin/products",        label: t("nav.products"),        icon: "🏷️" },
    { to: "/admin/categories",      label: t("nav.categories"),      icon: "📂" },
    { to: "/admin/platforms",       label: t("nav.platforms"),       icon: "🌐" },
    { to: "/admin/ingestion",       label: t("nav.ingestion"),       icon: "⬇️" },
    { to: "/admin/exchange-rates",  label: t("nav.exchange_rates"),  icon: "💱" },
    { to: "/admin/staff",           label: t("nav.staff"),           icon: "👥" },
  ];

  return (
    <aside className="w-60 shrink-0 bg-gray-900 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
        <span className="text-lg font-bold text-white">MuaHo</span>
        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">Admin</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {MENU_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-white font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <p className="text-sm text-gray-200 font-medium truncate">{user.fullName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span key={r} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
