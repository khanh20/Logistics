import { NavLink, useNavigate } from "react-router";
import { cn } from "~/lib/utils/cn";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { selectUser, selectAuth } from "~/lib/feature/auth/authSelector";
import { logout as logoutThunk } from "~/lib/feature/auth/authThunk";
import { store } from "~/lib/feature/store";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";


export function CustomerNavbar() {
  const { user, token } = useAppSelector(selectAuth);
  const isAuthenticated = !!token;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const NAV_ITEMS = [
    { to: "/", label: t("nav.home") },
    { to: "/orders", label: t("nav.user_orders") },
    { to: "/finance", label: "Tài chính" },
    { to: "/cart", label: t("nav.cart") },
  ];


  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");
  }

  async function handleLogout() {
    const refreshToken = store.getState().authState.refreshToken;
    if (refreshToken) {
      await dispatch(logoutThunk(refreshToken));
    }
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
                <NavLink to="/profile" className="hidden md:block">
                  <span className="text-sm text-red-100 hover:text-white transition-colors cursor-pointer font-medium">
                    {user?.fullName}
                  </span>
                </NavLink>
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
    </header>
  );
}
