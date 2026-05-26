import { useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/login";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { STAFF_ROLES, type Role } from "~/lib/constants/roles";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { login as loginThunk } from "~/lib/feature/auth/authThunk";
import { store } from "~/lib/feature/store";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đăng nhập — MuaHo Logistics" }];
}

export async function clientLoader(_: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (token) throw redirect("/");
  return null;
}

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t("auth.validation.credentials_required"));
      return;
    }

    setLoading(true);
    try {
      const res = await dispatch(loginThunk({ email, password })).unwrap();

      const isStaff = res.user.roles.some((r) =>
        STAFF_ROLES.includes(r as Role)
      );
      navigate(isStaff ? "/admin" : "/", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? t("auth.login_failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {t("auth.login_title")}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {t("auth.no_account")}{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t("auth.register_now")}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            label={t("auth.email")}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t("auth.password")}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t("auth.forgot_password")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={t("auth.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t("auth.login")}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          {t("auth.agree_prefix", { action: t("auth.login") })}{" "}
          <a href="#" className="text-primary hover:underline">
            {t("auth.terms")}
          </a>{" "}
          {t("auth.terms_and")}{" "}
          <a href="#" className="text-primary hover:underline">
            {t("auth.privacy")}
          </a>{" "}
          {t("auth.terms_suffix")}
        </div>
      </div>
    </div>
  );
}
