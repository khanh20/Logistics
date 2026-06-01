import { NavLink, useNavigate } from "react-router";
import { cn } from "~/lib/utils/cn";
import { useAuth } from "~/lib/hooks/useAuth";
import { useAuthStore } from "~/lib/stores/authStore";
import { authApi } from "~/lib/api/auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UrlOrderModal } from "./UrlOrderModal";


export function CustomerNavbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [urlModalOpen, setUrlModalOpen] = useState(false);

  const NAV_ITEMS = [
    { to: "/", label: t("nav.home") },
    { to: "/orders", label: t("nav.user_orders") },
    { to: "/cart", label: t("nav.cart") },
  ];


  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");
  }

  async function handleLogout() {
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    logout();
    navigate("/");
  }

  const isVi = i18n.language === "vi";

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="flex items-center gap-1">
            <span className="text-xl font-bold text-white">MuaHo</span>
            <span className="text-xl font-light text-red-200">Logistics</span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "text-white font-bold border-b-2 border-white"
                      : "text-red-100 hover:text-white hover:bg-primary-dark"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setUrlModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5
                         text-sm font-medium text-white hover:bg-white/25 transition-colors"
            >
              🔗 {t("url_order.nav_button")}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg 
                        border border-gray-200 text-xs font-semibold 
                        text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isVi ? t("common.lang_en") : t("common.lang_vi")}
            >
              <span className={cn(isVi ? "text-primary font-bold" : "text-gray-400")}>VI</span>
              <span className="text-gray-300">/</span>
              <span className={cn(!isVi ? "text-primary font-bold" : "text-gray-400")}>EN</span>
            </button>
            {isAuthenticated ? (
              <>
                <span className="text-sm text-red-100 hidden md:block">{user?.fullName}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-100 hover:text-white transition-colors"
                >
                  {t("auth.logout")}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-red-50 transition-colors"
                >
                  {t("auth.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-red-50 transition-colors"
                >
                  {t("auth.register")}
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>

      <UrlOrderModal open={urlModalOpen} onClose={() => setUrlModalOpen(false)} />
    </header>
  );
}
