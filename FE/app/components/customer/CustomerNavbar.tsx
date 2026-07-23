import { NavLink, useNavigate, useLocation } from "react-router";
import { cn } from "~/lib/utils/cn";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { selectAuth } from "~/lib/feature/auth/authSelector";
import { logout as logoutThunk } from "~/lib/feature/auth/authThunk";
import { store } from "~/lib/feature/store";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { UrlOrderModal } from "./UrlOrderModal";
import { NotificationBell } from "~/components/NotificationBell";
import {
  CaretDown,
  Heart,
  ShoppingCart,
  CurrencyCny,
  LinkIcon,
  ListIcon,
  X,
} from "~/components/shared/icons";

export function CustomerNavbar() {
  const { user, token } = useAppSelector(selectAuth);
  const isAuthenticated = !!token;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ordersRef = useRef<HTMLDivElement>(null);

  // Điều hướng chính — chỉ giữ 2 mục luôn hiện.
  const MAIN_ITEMS = [
    { to: "/", label: t("nav.home") },
    { to: "/products", label: t("nav.products") },
  ];

  // 5 mục thuộc cùng một hành trình đơn hàng → gom vào một menu thả xuống.
  const ORDER_ITEMS = [
    { to: "/orders", label: t("nav.user_orders") },
    { to: "/packages", label: t("nav.user_packages") },
    { to: "/delivery-requests", label: t("nav.user_deliveries") },
    { to: "/forecast", label: t("nav.user_forecast") },
    { to: "/claims", label: t("nav.user_claims") },
  ];

  const ACTION_ITEMS = [
    { to: "/favorites", label: t("nav.favorites"), Icon: Heart },
    { to: "/finance", label: t("nav.finance"), Icon: CurrencyCny },
    { to: "/cart", label: t("nav.cart"), Icon: ShoppingCart },
  ];

  const ordersActive = ORDER_ITEMS.some((i) => location.pathname.startsWith(i.to));

  // Đóng mọi menu khi đổi trang.
  useEffect(() => {
    setOrdersOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Đóng menu thả xuống khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!ordersOpen) return;
    function onDown(e: MouseEvent) {
      if (!ordersRef.current?.contains(e.target as Node)) setOrdersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOrdersOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ordersOpen]);

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");
  }

  async function handleLogout() {
    const refreshToken = store.getState().authState.refreshToken;
    if (refreshToken) await dispatch(logoutThunk(refreshToken));
    navigate("/");
  }

  const isVi = i18n.language === "vi";
  const linkBase =
    "rounded-md px-3 py-2 text-[15px] font-medium whitespace-nowrap transition-colors";

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-md">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex h-16 items-center gap-3">
          <a href="/" className="flex shrink-0 items-center gap-1">
            <span className="text-xl font-bold text-white">MuaHo</span>
            <span className="text-xl font-light text-red-200">Logistics</span>
          </a>

          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {MAIN_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    linkBase,
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-red-100 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="relative" ref={ordersRef}>
              <button
                type="button"
                onClick={() => setOrdersOpen((v) => !v)}
                aria-expanded={ordersOpen}
                aria-haspopup="menu"
                className={cn(
                  linkBase,
                  "inline-flex items-center gap-1",
                  ordersActive || ordersOpen
                    ? "bg-white/15 text-white"
                    : "text-red-100 hover:bg-white/10 hover:text-white"
                )}
              >
                {t("nav.my_orders_group")}
                <CaretDown
                  size={14}
                  weight="bold"
                  className={cn("transition-transform", ordersOpen && "rotate-180")}
                />
              </button>

              {ordersOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-1 min-w-[13rem] overflow-hidden rounded-lg
                             border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {ORDER_ITEMS.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      role="menuitem"
                      className={({ isActive }) =>
                        cn(
                          "block px-4 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-red-50 font-semibold text-primary"
                            : "text-slate-700 hover:bg-slate-50"
                        )
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => setUrlModalOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm
                         font-medium text-white transition-colors hover:bg-white/25 sm:inline-flex"
            >
              <LinkIcon size={16} weight="bold" />
              {t("url_order.nav_button")}
            </button>

            {ACTION_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "hidden rounded-lg p-2 transition-colors lg:block",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-red-100 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                <Icon size={20} weight="regular" />
              </NavLink>
            ))}

            <button
              onClick={toggleLanguage}
              title={isVi ? t("common.lang_en") : t("common.lang_vi")}
              className="flex items-center gap-1 rounded-lg border border-white/25 px-2 py-1
                         text-xs font-semibold text-red-100 transition-colors hover:bg-white/10"
            >
              <span className={cn(isVi && "font-bold text-white")}>VI</span>
              <span className="text-white/40">/</span>
              <span className={cn(!isVi && "font-bold text-white")}>EN</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-1 lg:gap-3">
                <NotificationBell type="customer" />
                
                <NavLink
                  to="/profile"
                  className="hidden max-w-[10rem] truncate px-2 text-sm font-medium text-red-100
                             transition-colors hover:text-white xl:block"
                >
                  {user?.fullName}
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="hidden whitespace-nowrap px-2 text-sm text-red-100 transition-colors
                             hover:text-white sm:block"
                >
                  {t("auth.logout")}
                </button>
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary
                             transition-colors hover:bg-red-50"
                >
                  {t("auth.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  className="hidden rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium
                             text-white transition-colors hover:bg-white/10 sm:block"
                >
                  {t("auth.register")}
                </NavLink>
              </>
            )}

          
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t("nav.menu", "Menu")}
              aria-expanded={mobileOpen}
              className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            >
              {mobileOpen ? <X size={22} weight="bold" /> : <ListIcon size={22} weight="bold" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-white/15 bg-primary px-4 pb-4 pt-2 lg:hidden">
          <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-1 sm:grid-cols-3">
            {[...MAIN_ITEMS, ...ORDER_ITEMS, ...ACTION_ITEMS].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-red-100 hover:bg-white/10 hover:text-white"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      <UrlOrderModal open={urlModalOpen} onClose={() => setUrlModalOpen(false)} />
    </header>
  );
}
