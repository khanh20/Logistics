import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/ingestion";
import { ingestionApi, categoriesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { cn } from "~/lib/utils/cn";
import type { CategoryTree, CrawlResultResponse, CrawlUrlResultResponse } from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Import sản phẩm — MuaHo Admin" }];
}

export async function clientLoader() {
  const [platformsRes, categoriesRes] = await Promise.all([
    ingestionApi.getAvailablePlatforms(),
    categoriesApi.getTree(),
  ]);
  return {
    availablePlatforms: platformsRes.data,
    categories: categoriesRes.data,
  };
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
      <label className="text-sm font-medium text-gray-700">
        {t("ingestion.category_label")}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                   focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white"
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

export default function IngestionPage({
  loaderData,
}: {
  loaderData: { availablePlatforms: string[]; categories: CategoryTree[] };
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabMode>("keyword");

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("ingestion.title")}</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {(["keyword", "url"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === mode
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {mode === "keyword" ? t("ingestion.crawl_keyword") : t("ingestion.crawl_url")}
          </button>
        ))}
      </div>

      {tab === "keyword" ? (
        <KeywordCrawlForm
          platforms={loaderData.availablePlatforms}
          categories={loaderData.categories}
        />
      ) : (
        <UrlCrawlForm categories={loaderData.categories} />
      )}
    </div>
  );
}

// ── Keyword Crawl ─────────────────────────────────────────────────────────────
function KeywordCrawlForm({
  platforms,
  categories,
}: {
  platforms: string[];
  categories: CategoryTree[];
}) {
  const { t } = useTranslation();
  const [platform, setPlatform]     = useState(platforms[0] ?? "eBay");
  const [keyword, setKeyword]       = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<CrawlResultResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 min-w-40">
              <label className="text-sm font-medium text-gray-700">{t("ingestion.platform_label")}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-56">
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
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
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
  const [url, setUrl]               = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<CrawlUrlResultResponse | null>(null);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await ingestionApi.crawlByUrl({
        url,
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("ingestion.url_label")}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("ingestion.url_placeholder")}
            required
          />
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" loading={loading} size="md">
            {loading ? t("ingestion.crawling") : t("ingestion.start_crawl")}
          </Button>
        </form>
      </div>

      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Kết quả</h3>
          <CrawlStatusBadge status={result.status} />
          {result.reason && (
            <p className="mt-2 text-sm text-gray-600">{result.reason}</p>
          )}
          {result.savedProductId && (
            <p className="mt-2 text-sm text-gray-600">
              Product ID:{" "}
              <a
                href={`/products/${result.savedProductId}`}
                className="text-primary hover:underline font-medium"
              >
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Summary bar */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-6 text-sm">
        <span className="font-medium text-gray-900">
          {result.platformName} — "{result.keyword}"
        </span>
        <span className="text-green-700">✓ Lưu: {result.saved}</span>
        <span className="text-gray-500">Tìm thấy: {result.totalFound}</span>
        <span className="text-amber-600">Bỏ qua: {result.skipped}</span>
        <span className="text-red-600">Hàng cấm: {result.forbidden}</span>
      </div>

      {/* Item list */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {result.items.map((item) => (
          <div key={item.platformProductId} className="px-6 py-3 flex items-start gap-3">
            <CrawlStatusBadge status={item.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{item.title}</p>
              {item.reason && (
                <p className="text-xs text-gray-500 mt-0.5">{item.reason}</p>
              )}
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
    Created:   { variant: "success", labelKey: "ingestion.status_created" },
    Updated:   { variant: "info",    labelKey: "ingestion.status_updated" },
    Skipped:   { variant: "default", labelKey: "ingestion.status_skipped" },
    Forbidden: { variant: "error",   labelKey: "ingestion.status_forbidden" },
    Error:     { variant: "error",   labelKey: "ingestion.status_error" },
  };

  const cfg = CONFIG[status] ?? { variant: "default" as const, labelKey: "" };
  return (
    <Badge variant={cfg.variant}>
      {cfg.labelKey ? t(cfg.labelKey) : status}
    </Badge>
  );
}
