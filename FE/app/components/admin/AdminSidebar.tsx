import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import { cn } from "~/lib/utils/cn";
import type { UserAuthInfo } from "~/lib/types/auth";

interface AdminSidebarProps {
  user: UserAuthInfo;
}

type MenuItem = {
  to?: string;
  label: string;
  icon: string;
  end?: boolean;
  children?: MenuItem[];
};

export function AdminSidebar({ user }: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const MENU_ITEMS: MenuItem[] = [
    { to: "/admin/orders", label: t("nav.orders"), icon: "📦" },
    { to: "/admin/platform-orders", label: t("nav.platform_orders"), icon: "🛍️" },
    { to: "/admin/products", label: t("nav.products"), icon: "🏷️" },
    { to: "/admin/categories", label: t("nav.categories"), icon: "📂" },
    { to: "/admin/platforms", label: t("nav.platforms"), icon: "🌐" },
    { to: "/admin/ingestion", label: t("nav.ingestion"), icon: "⬇️" },
    { to: "/admin/exchange-rates", label: t("nav.exchange_rates"), icon: "💱" },
    { to: "/admin/staff", label: t("nav.staff"), icon: "👥" },
    {
      label: t("nav.finance"),
      icon: "💰",
      children: [
        { to: "/admin/finance", label: t("nav.finance_overview"), icon: "📊", end: true },
        { to: "/admin/finance/kyc", label: t("nav.finance_kyc"), icon: "🆔" },
        { to: "/admin/finance/withdraws", label: t("nav.finance_withdraws"), icon: "🏦" },
        { to: "/admin/finance/transactions", label: t("nav.finance_transactions"), icon: "🧾" },
        { to: "/admin/finance/refunds", label: t("nav.finance_refunds"), icon: "💸" },
        { to: "/admin/finance/reconcile", label: t("nav.finance_reconcile"), icon: "⚖️" },
        { to: "/admin/finance/fraud", label: t("nav.finance_fraud"), icon: "🚨" },
        { to: "/admin/finance/payment-locks", label: t("nav.finance_payment_locks"), icon: "🔒" },
        { to: "/admin/finance/fee-rules", label: t("nav.finance_fee_rules"), icon: "📊" },
        { to: "/admin/finance/vip-tiers", label: t("nav.finance_vip_tiers"), icon: "⭐" },
        { to: "/admin/finance/transaction-types", label: t("nav.finance_transaction_types"), icon: "⚙️" },
        { to: "/admin/finance/bank-accounts", label: t("nav.finance_bank_accounts"), icon: "💳" },
        { to: "/admin/finance/webhook-logs", label: t("nav.finance_webhook_logs"), icon: "📡" },

      ]
    }
  ];

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    return {
      [t("nav.finance")]: location.pathname.startsWith("/admin/finance")
    };
  });

  const toggleMenu = (label: string) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const paddingLeft = `${0.75 + depth * 1.25}rem`;

    if (item.children) {
      const isOpen = openMenus[item.label];
      return (
        <div key={item.label} className="flex flex-col space-y-1">
          <button
            onClick={() => toggleMenu(item.label)}
            className="flex items-center justify-between w-full py-2 pr-3 rounded-md text-sm transition-colors text-gray-400 hover:bg-gray-800 hover:text-white"
            style={{ paddingLeft }}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </div>
            {isOpen ? <DownOutlined className="text-xs shrink-0 ml-2" /> : <RightOutlined className="text-xs shrink-0 ml-2" />}
          </button>

          {isOpen && (
            <div className="flex flex-col space-y-1 mt-1">
              {item.children.map(child => renderMenuItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to!}
        end={item.end}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 py-2 pr-3 rounded-md text-sm transition-colors",
            isActive
              ? "bg-primary text-white font-medium"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          )
        }
        style={{ paddingLeft }}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="truncate flex-1">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="w-64 shrink-0 bg-gray-900 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
        <span className="text-lg font-bold text-white">MuaHo</span>
        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">Admin</span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
        {MENU_ITEMS.map(item => renderMenuItem(item))}
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
