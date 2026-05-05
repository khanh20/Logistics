import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "~/lib/stores/authStore";
import { authApi } from "~/lib/api/auth";
import { cn } from "~/lib/utils/cn";
import type { UserAuthInfo } from "~/lib/types/auth";

interface AdminTopbarProps {
  user: UserAuthInfo;
}

export function AdminTopbar({ user }: AdminTopbarProps) {
  const { t, i18n } = useTranslation();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        /* ignore */
      }
    }
    logout();
    navigate("/");
  }

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");
  }

  const isVi = i18n.language === "vi";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          title={isVi ? t("common.lang_en") : t("common.lang_vi")}
        >
          <span className={cn(isVi ? "text-primary font-bold" : "text-gray-400")}>VI</span>
          <span className="text-gray-300">/</span>
          <span className={cn(!isVi ? "text-primary font-bold" : "text-gray-400")}>EN</span>
        </button>

        <span className="text-sm text-gray-600">{user.fullName}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          {t("auth.logout")}
        </button>
      </div>
    </header>
  );
}
