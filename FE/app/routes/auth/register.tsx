import { useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/register";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { register as registerThunk } from "~/lib/feature/auth/authThunk";
import { store } from "~/lib/feature/store";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đăng ký — MuaHo Logistics" }];
}

export async function clientLoader(_: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (token) throw redirect("/");
  return null;
}

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [errors, setErrors]           = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  function validate(f: FormState): FormErrors {
    const e: FormErrors = {};

    if (!f.fullName.trim())
      e.fullName = t("auth.validation.full_name_required");
    else if (f.fullName.trim().length < 2)
      e.fullName = t("auth.validation.full_name_min");

    if (!f.email)
      e.email = t("auth.validation.email_required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      e.email = t("auth.validation.email_invalid");

    if (!f.password)
      e.password = t("auth.validation.password_required");
    else if (f.password.length < 8)
      e.password = t("auth.validation.password_min");

    if (!f.confirmPassword)
      e.confirmPassword = t("auth.validation.confirm_required");
    else if (f.password !== f.confirmPassword)
      e.confirmPassword = t("auth.validation.confirm_mismatch");

    return e;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await dispatch(registerThunk({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      })).unwrap();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? t("auth.register_failed");
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {t("auth.register_title")}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {t("auth.have_account")}{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t("auth.login")}
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t("auth.full_name")}
            name="fullName"
            type="text"
            placeholder="Nguyễn Văn A"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
            autoComplete="name"
            required
          />

          <Input
            label={t("auth.email")}
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
            required
          />

          <Input
            label={t("auth.phone")}
            name="phone"
            type="tel"
            placeholder={t("auth.phone_placeholder")}
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
          />

          <Input
            label={t("auth.password")}
            name="password"
            type="password"
            placeholder={t("auth.password_placeholder")}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="new-password"
            hint={t("auth.password_min_hint")}
            required
          />

          <Input
            label={t("auth.confirm_password")}
            name="confirmPassword"
            type="password"
            placeholder={t("auth.confirm_placeholder")}
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
          />

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
            {t("auth.register")}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          {t("auth.agree_prefix", { action: t("auth.register") })}{" "}
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
