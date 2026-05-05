import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/platforms._index";
import { platformsApi } from "~/lib/api/platforms";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { cn } from "~/lib/utils/cn";
import { PLATFORM_ICON, API_PROVIDERS, type ApiProvider } from "~/lib/constants/platforms";
import type { Platform, CreatePlatformRequest } from "~/lib/types/platform";
import type { ApiResponse } from "~/lib/types/common";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sàn TMĐT — MuaHo Admin" }];
}

export async function clientLoader() {
  const res = await platformsApi.getAll();
  return { platforms: res.data };
}

export default function PlatformsPage({ loaderData }: { loaderData: { platforms: Platform[] } }) {
  const { t } = useTranslation();
  const [platforms, setPlatforms] = useState<Platform[]>(loaderData.platforms);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [credentialsPlatformId, setCredentialsPlatformId] = useState<string | null>(null);

  function selectedPlatform() {
    return platforms.find((p) => p.id === selectedId) ?? null;
  }

  async function handleToggleActive(platform: Platform) {
    try {
      const res = await platformsApi.update(platform.id, {
        name: platform.name,
        baseUrl: platform.baseUrl,
        apiProvider: platform.apiProvider,
        isActive: !platform.isActive,
        logoUrl: platform.logoUrl ?? undefined,
      });
      setPlatforms((prev) => prev.map((p) => (p.id === platform.id ? res.data : p)));
    } catch { /* noop */ }
  }

  async function handleCreated(p: Platform) {
    setPlatforms((prev) => [...prev, p]);
    setShowCreate(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("platform.title")}</h1>
        <Button onClick={() => setShowCreate(true)} size="md">
          + {t("platform.create")}
        </Button>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {platforms.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{PLATFORM_ICON[p.name] ?? "🛒"}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.baseUrl}</p>
                </div>
              </div>
              <Badge variant={p.isActive ? "success" : "default"}>
                {p.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
              <span>{t("platform.shop_count", { count: p.shopCount })}</span>
              <span>Provider: {p.apiProvider}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedId(p.id)}
              >
                Shops
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCredentialsPlatformId(p.id)}
              >
                {t("platform.set_credentials")}
              </Button>
              <Button
                variant={p.isActive ? "danger" : "secondary"}
                size="sm"
                onClick={() => handleToggleActive(p)}
              >
                {p.isActive ? "Tắt" : "Bật"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <p className="text-center text-gray-400 py-16">{t("common.no_data")}</p>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePlatformModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Credentials modal */}
      {credentialsPlatformId && (
        <CredentialsModal
          platformId={credentialsPlatformId}
          onClose={() => setCredentialsPlatformId(null)}
        />
      )}

      {/* Shops drawer */}
      {selectedId && (
        <ShopsDrawer
          platform={selectedPlatform()!}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
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
  const [form, setForm] = useState<CreatePlatformRequest>({
    name: "",
    baseUrl: "",
    apiProvider: "PublicApi",
  });
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("platform.create")}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("platform.name")}
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            label={t("platform.base_url")}
            name="baseUrl"
            type="url"
            value={form.baseUrl}
            onChange={handleChange}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              {t("platform.api_provider")}
            </label>
            <select
              name="apiProvider"
              value={form.apiProvider}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {API_PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
function CredentialsModal({
  platformId,
  onClose,
}: {
  platformId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [apiKey, setApiKey]       = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await platformsApi.setCredentials(platformId, {
        apiKey,
        apiSecret: apiSecret || undefined,
      });
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("platform.credentials")}</h2>
        {success ? (
          <p className="text-green-600 text-center py-4">✓ Credentials đã cập nhật!</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <Input
              label="API Secret (tuỳ chọn)"
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
function ShopsDrawer({
  platform,
  onClose,
}: {
  platform: Platform;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [shops, setShops] = useState<import("~/lib/types/platform").PlatformShop[] | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    platformsApi
      .getShops(platform.id)
      .then((res) => setShops(res.data))
      .finally(() => setLoading(false));
  });

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Shops — {platform.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="flex-1 p-6">
          {loading && <p className="text-gray-400">{t("common.loading")}</p>}
          {!loading && shops?.length === 0 && (
            <p className="text-gray-400">{t("common.no_data")}</p>
          )}
          {shops?.map((shop) => (
            <div
              key={shop.id}
              className="border border-gray-200 rounded-xl p-4 mb-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{shop.shopName}</p>
                  <p className="text-xs text-gray-500">{shop.shopIdOnPlatform}</p>
                </div>
                {shop.isBlacklisted && (
                  <Badge variant="error">Blacklisted</Badge>
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                <span>Rating: {shop.internalRating.toFixed(1)}/5</span>
                <span>Sản phẩm: {shop.totalProductsCrawled}</span>
                {shop.avgShipDays && <span>Ship: ~{shop.avgShipDays} ngày</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
