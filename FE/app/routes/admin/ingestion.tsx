import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/ingestion";
import { ingestionApi, categoriesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { SectionHeader } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { CheckCircle, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { cn } from "~/lib/utils/cn";
import type { CategoryTree, CrawlResultResponse, CrawlUrlResultResponse } from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Import sản phẩm — MuaHo Admin" }];
}

interface FlatCategory {
  id: string;
  nameVn: string;
  depth: number;
}

function flattenTree(nodes: CategoryTree[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { id: node.id, nameVn: node.nameVn, depth },
    ...flattenTree(node.children ?? [], depth + 1),
  ]);
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: CategoryTree[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  const flat = flattenTree(categories);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-700">{t("ingestion.category_label")}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="">{t("ingestion.category_placeholder")}</option>
        {flat.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {"—".repeat(cat.depth)} {cat.nameVn}
          </option>
        ))}
      </select>
    </div>
  );
}

type TabMode = "keyword" | "url";

export default function IngestionPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabMode>("keyword");

  const { data, loading, error } = useFetch<{ availablePlatforms: string[]; categories: CategoryTree[] }>(
    async () => {
      const [platformsRes, categoriesRes] = await Promise.all([
        ingestionApi.getAvailablePlatforms(),
        categoriesApi.getTree(),
      ]);
      return { availablePlatforms: platformsRes.data, categories: categoriesRes.data };
    },
    []
  );

  return (
    <FadeIn className="max-w-4xl space-y-6">
      <SectionHeader title={t("ingestion.title")} />

      {/* Tab switcher */}
      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {(["keyword", "url"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {mode === "keyword" ? t("ingestion.crawl_keyword") : t("ingestion.crawl_url")}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <SkeletonPanel rows={4} cols={2} />
      ) : !data ? null : tab === "keyword" ? (
        <KeywordCrawlForm platforms={data.availablePlatforms} categories={data.categories} />
      ) : (
        <UrlCrawlForm categories={data.categories} />
      )}
    </FadeIn>
  );
}

// ── Keyword Crawl ─────────────────────────────────────────────────────────────
function KeywordCrawlForm({ platforms, categories }: { platforms: string[]; categories: CategoryTree[] }) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState(platforms[0] ?? "eBay");
  const [keyword, setKeyword] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await ingestionApi.crawlByKeyword({
        platformName: platform,
        keyword,
        maxResults,
        categoryId: categoryId || undefined,
      });
      setResult(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-40 flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">{t("ingestion.platform_label")}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-56 flex-1">
              <Input
                label={t("ingestion.keyword_label")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("ingestion.keyword_placeholder")}
                required
              />
            </div>
            <div className="w-32">
              <Input
                label={t("ingestion.max_results_label")}
                type="number"
                min={1}
                max={100}
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
              />
            </div>
          </div>
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <WarningCircle size={18} weight="fill" />
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} size="md">
            {loading ? t("ingestion.crawling") : t("ingestion.start_crawl")}
          </Button>
        </form>
      </div>

      {result && <CrawlResultPanel result={result} />}
    </div>
  );
}

// ── URL Crawl ─────────────────────────────────────────────────────────────────
function UrlCrawlForm({ categories }: { categories: CategoryTree[] }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlUrlResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await ingestionApi.crawlByUrl({ url, categoryId: categoryId || undefined });
      setResult(res.data);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("ingestion.url_label")}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("ingestion.url_placeholder")}
            required
          />
          <CategorySelect categories={categories} value={categoryId} onChange={setCategoryId} />
          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <WarningCircle size={18} weight="fill" />
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} size="md">
            {loading ? t("ingestion.crawling") : t("ingestion.start_crawl")}
          </Button>
        </form>
      </div>

      {result && (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="mb-3 font-heading font-semibold text-slate-900">{t("ingestion.result", "Kết quả")}</h3>
          <CrawlStatusBadge status={result.status} />
          {result.reason && <p className="mt-2 text-sm text-slate-600">{result.reason}</p>}
          {result.savedProductId && (
            <p className="mt-2 text-sm text-slate-600">
              Product ID:{" "}
              <a href={`/products/${result.savedProductId}`} className="font-medium text-primary hover:underline">
                {result.savedProductId}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────
function CrawlResultPanel({ result }: { result: CrawlResultResponse }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-6 border-b border-slate-200 bg-slate-50/80 px-6 py-4 text-sm">
        <span className="font-medium text-slate-900">
          {result.platformName} — "{result.keyword}"
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <CheckCircle size={15} weight="fill" />
          {t("ingestion.saved", "Lưu")}: {result.saved}
        </span>
        <span className="text-slate-500">{t("ingestion.found", "Tìm thấy")}: {result.totalFound}</span>
        <span className="text-amber-600">{t("ingestion.skipped_count", "Bỏ qua")}: {result.skipped}</span>
        <span className="text-red-600">{t("ingestion.forbidden_count", "Hàng cấm")}: {result.forbidden}</span>
      </div>

      {/* Item list */}
      <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
        {result.items.map((item) => (
          <div key={item.platformProductId} className="flex items-start gap-3 px-6 py-3">
            <CrawlStatusBadge status={item.status} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-900">{item.title}</p>
              {item.reason && <p className="mt-0.5 text-xs text-slate-500">{item.reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrawlStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const CONFIG: Record<string, { variant: import("~/components/ui/Badge").BadgeProps["variant"]; labelKey: string }> = {
    Created: { variant: "success", labelKey: "ingestion.status_created" },
    Updated: { variant: "info", labelKey: "ingestion.status_updated" },
    Skipped: { variant: "default", labelKey: "ingestion.status_skipped" },
    Forbidden: { variant: "error", labelKey: "ingestion.status_forbidden" },
    Error: { variant: "error", labelKey: "ingestion.status_error" },
  };

  const cfg = CONFIG[status] ?? { variant: "default" as const, labelKey: "" };
  return <Badge variant={cfg.variant}>{cfg.labelKey ? t(cfg.labelKey) : status}</Badge>;
}
