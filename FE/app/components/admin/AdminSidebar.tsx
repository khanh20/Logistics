import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import { cn } from "~/lib/utils/cn";
import type { UserAuthInfo } from "~/lib/types/auth";

import {
  FaBox,
  FaBagShopping,
  FaTags,
  FaFolder,
  FaGlobe,
  FaFileImport,
  FaMoneyBillTransfer,
  FaUsers,
  FaMoneyBillWave,
  FaChartPie,
  FaIdCard,
  FaBuildingColumns,
  FaReceipt,
  FaHandHoldingDollar,
  FaScaleBalanced,
  FaTriangleExclamation,
  FaLock,
  FaPercent,
  FaStar,
  FaGear,
  FaCreditCard,
  FaSatelliteDish
} from "react-icons/fa6";

interface AdminSidebarProps {
  user: UserAuthInfo;
}

type MenuItem = {
  to?: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  children?: MenuItem[];
};

export function AdminSidebar({ user }: AdminSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const MENU_ITEMS: MenuItem[] = [
    { to: "/admin/orders", label: t("nav.orders"), icon: <FaBox className="text-base text-blue-400" /> },
    { to: "/admin/platform-orders", label: t("nav.platform_orders"), icon: <FaBagShopping className="text-base text-purple-400" /> },
    { to: "/admin/products", label: t("nav.products"), icon: <FaTags className="text-base text-green-400" /> },
    { to: "/admin/categories", label: t("nav.categories"), icon: <FaFolder className="text-base text-yellow-400" /> },
    { to: "/admin/platforms", label: t("nav.platforms"), icon: <FaGlobe className="text-base text-cyan-400" /> },
    { to: "/admin/ingestion", label: t("nav.ingestion"), icon: <FaFileImport className="text-base text-orange-400" /> },
    { to: "/admin/exchange-rates", label: t("nav.exchange_rates"), icon: <FaMoneyBillTransfer className="text-base text-emerald-400" /> },
    { to: "/admin/staff", label: t("nav.staff"), icon: <FaUsers className="text-base text-pink-400" /> },
    {
      label: t("nav.finance"),
      icon: <FaMoneyBillWave className="text-base text-emerald-400" />,
      children: [
        { to: "/admin/finance", label: t("nav.finance_overview"), icon: <FaChartPie className="text-base text-indigo-400" />, end: true },
        { to: "/admin/finance/kyc", label: t("nav.finance_kyc"), icon: <FaIdCard className="text-base text-rose-400" /> },
        { to: "/admin/finance/withdraws", label: t("nav.finance_withdraws"), icon: <FaBuildingColumns className="text-base text-amber-400" /> },
        { to: "/admin/finance/transactions", label: t("nav.finance_transactions"), icon: <FaReceipt className="text-base text-lime-400" /> },
        { to: "/admin/finance/refunds", label: t("nav.finance_refunds"), icon: <FaHandHoldingDollar className="text-base text-sky-400" /> },
        { to: "/admin/finance/reconcile", label: t("nav.finance_reconcile"), icon: <FaScaleBalanced className="text-base text-fuchsia-400" /> },
        { to: "/admin/finance/fraud", label: t("nav.finance_fraud"), icon: <FaTriangleExclamation className="text-base text-red-500" /> },
        { to: "/admin/finance/payment-locks", label: t("nav.finance_payment_locks"), icon: <FaLock className="text-base text-slate-400" /> },
        { to: "/admin/finance/fee-rules", label: t("nav.finance_fee_rules"), icon: <FaPercent className="text-base text-violet-400" /> },
        { to: "/admin/finance/vip-tiers", label: t("nav.finance_vip_tiers"), icon: <FaStar className="text-base text-yellow-400" /> },
        { to: "/admin/finance/transaction-types", label: t("nav.finance_transaction_types"), icon: <FaGear className="text-base text-gray-400" /> },
        { to: "/admin/finance/bank-accounts", label: t("nav.finance_bank_accounts"), icon: <FaCreditCard className="text-base text-blue-300" /> },
        { to: "/admin/finance/webhook-logs", label: t("nav.finance_webhook_logs"), icon: <FaSatelliteDish className="text-base text-emerald-300" /> },
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
            className="flex items-center justify-between w-full py-2 pr-3 rounded-md text-sm transition-colors text-slate-400 hover:bg-slate-800/60 hover:text-white"
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
              ? "bg-white text-gray-900 font-medium"
              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
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
    <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <span className="text-lg font-bold text-white">MuaHo</span>
        <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">
          Admin
        </span>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
        {MENU_ITEMS.map(item => renderMenuItem(item))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
        <p className="text-sm text-slate-200 font-medium truncate">{user.fullName}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <span key={r} className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
