import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/platforms._index";
import { platformsApi } from "~/lib/api/platforms";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonCards } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Plus, Storefront, X, CheckCircle, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { API_PROVIDERS } from "~/lib/constants/platforms";
import type { Platform, CreatePlatformRequest } from "~/lib/types/platform";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sàn TMĐT — MuaHo Admin" }];
}

export default function PlatformsPage() {
  const { t } = useTranslation();
  const { data, loading, error, setData } = useFetch<Platform[]>(
    async () => (await platformsApi.getAll()).data,
    []
  );

  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [credentialsPlatformId, setCredentialsPlatformId] = useState<string | null>(null);

  const platforms = data ?? [];

  async function handleToggleActive(platform: Platform) {
    try {
      const res = await platformsApi.update(platform.id, {
        name: platform.name,
        baseUrl: platform.baseUrl,
        apiProvider: platform.apiProvider,
        isActive: !platform.isActive,
        logoUrl: platform.logoUrl ?? undefined,
      });
      setData((prev) => (prev ?? []).map((p) => (p.id === platform.id ? res.data : p)));
    } catch {
      /* noop */
    }
  }

  function handleCreated(p: Platform) {
    setData((prev) => [...(prev ?? []), p]);
    setShowCreate(false);
  }

  const selectedPlatform = platforms.find((p) => p.id === selectedId) ?? null;

  return (
    <FadeIn className="space-y-6">
      <SectionHeader
        title={t("platform.title")}
        action={
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <Plus size={16} weight="bold" />
            {t("platform.create")}
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <SkeletonCards count={6} />
      ) : platforms.length === 0 ? (
        <EmptyState icon={<Storefront size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platforms.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Storefront size={22} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500">{p.baseUrl}</p>
                  </div>
                </div>
                <Badge variant={p.isActive ? "success" : "default"}>
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="flex gap-4 text-sm text-slate-500">
                <span>{t("platform.shop_count", { count: p.shopCount })}</span>
                <span>Provider: {p.apiProvider}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedId(p.id)}>
                  Shops
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setCredentialsPlatformId(p.id)}>
                  {t("platform.set_credentials")}
                </Button>
                <Button
                  variant={p.isActive ? "danger" : "secondary"}
                  size="sm"
                  onClick={() => handleToggleActive(p)}
                >
                  {p.isActive ? t("common.off", "Tắt") : t("common.on", "Bật")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreatePlatformModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {credentialsPlatformId && (
        <CredentialsModal platformId={credentialsPlatformId} onClose={() => setCredentialsPlatformId(null)} />
      )}
      {selectedId && selectedPlatform && (
        <ShopsDrawer platform={selectedPlatform} onClose={() => setSelectedId(null)} />
      )}
    </FadeIn>
  );
}

// ── Create Platform Modal ─────────────────────────────────────────────────────
function CreatePlatformModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (p: Platform) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreatePlatformRequest>({ name: "", baseUrl: "", apiProvider: "PublicApi" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await platformsApi.create(form);
      onCreated(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-heading text-lg font-semibold text-slate-900">{t("platform.create")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("platform.name")} name="name" value={form.name} onChange={handleChange} required />
          <Input label={t("platform.base_url")} name="baseUrl" type="url" value={form.baseUrl} onChange={handleChange} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">{t("platform.api_provider")}</label>
            <select
              name="apiProvider"
              value={form.apiProvider}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {API_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <WarningCircle size={18} weight="fill" />
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {t("common.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Credentials Modal ─────────────────────────────────────────────────────────
function CredentialsModal({ platformId, onClose }: { platformId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await platformsApi.setCredentials(platformId, { apiKey, apiSecret: apiSecret || undefined });
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 font-heading text-lg font-semibold text-slate-900">{t("platform.credentials")}</h2>
        {success ? (
          <p className="flex items-center justify-center gap-1.5 py-4 text-emerald-600">
            <CheckCircle size={18} weight="fill" />
            {t("platform.credentials_saved", "Credentials đã cập nhật!")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
            <Input
              label={t("platform.api_secret_optional", "API Secret (tuỳ chọn)")}
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Shops Drawer ──────────────────────────────────────────────────────────────
function ShopsDrawer({ platform, onClose }: { platform: Platform; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: shops, loading } = useFetch(
    async () => (await platformsApi.getShops(platform.id)).data,
    [platform.id]
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-slate-900">Shops — {platform.name}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex-1 p-6">
          {loading && !shops ? (
            <div className="space-y-3">
              <SkeletonCards count={3} />
            </div>
          ) : !shops?.length ? (
            <EmptyState icon={<Storefront size={40} />} title={t("common.no_data")} />
          ) : (
            shops.map((shop) => (
              <div key={shop.id} className="mb-3 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{shop.shopName}</p>
                    <p className="text-xs text-slate-500">{shop.shopIdOnPlatform}</p>
                  </div>
                  {shop.isBlacklisted && <Badge variant="error">Blacklisted</Badge>}
                </div>
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>Rating: {shop.internalRating.toFixed(1)}/5</span>
                  <span>{t("platform.products_label", "Sản phẩm")}: {shop.totalProductsCrawled}</span>
                  {shop.avgShipDays && <span>Ship: ~{shop.avgShipDays} {t("order.days", "ngày")}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
