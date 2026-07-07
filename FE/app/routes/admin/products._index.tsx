import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/products._index";
import { productsApi } from "~/lib/api/products";
import { categoriesApi } from "~/lib/api/categories";
import { platformsApi } from "~/lib/api/platforms";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import {
  Funnel, Star, Eye, Trash, Package, Image as ImageIcon,
  CaretLeft, CaretRight, WarningCircle,
} from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { cn } from "~/lib/utils/cn";
import { formatCNY } from "~/lib/utils/format";
import type { ProductListItem, PagedProductResponse, ProductSearchParams } from "~/lib/types/product";
import type { CategoryTree } from "~/lib/types/category";
import type { PlatformSlim } from "~/lib/types/platform";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý sản phẩm — MuaHo Admin" }];
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { t } = useTranslation();

  // Form state
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Committed params → deps cho useFetch
  const [params, setParams] = useState<ProductSearchParams>({ page: 1, pageSize: PAGE_SIZE });

  // Bộ lọc (load 1 lần, không reload theo filter)
  const options = useFetch<{ categories: CategoryTree[]; platforms: PlatformSlim[] }>(async () => {
    const [cat, plat] = await Promise.all([categoriesApi.getTree(), platformsApi.getAllActive()]);
    return { categories: cat.data, platforms: plat.data };
  }, []);

  // Sản phẩm (reload theo params)
  const { data, loading, error, setData, reload } = useFetch<PagedProductResponse>(async () => {
    const res = await productsApi.search(params);
    return res.data;
  }, [params]);

  function buildParams(overridePage: number): ProductSearchParams {
    return {
      keyword: keyword.trim() || undefined,
      categoryId: categoryId || undefined,
      platformId: platformId || undefined,
      minPriceCny: minPrice ? parseFloat(minPrice) : undefined,
      maxPriceCny: maxPrice ? parseFloat(maxPrice) : undefined,
      activeOnly: activeOnly || undefined,
      page: overridePage,
      pageSize: PAGE_SIZE,
    };
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setParams(buildParams(1));
  }

  function handlePage(newPage: number) {
    setPage(newPage);
    setParams(buildParams(newPage));
  }

  function handleReset() {
    setKeyword("");
    setCategoryId("");
    setPlatformId("");
    setMinPrice("");
    setMaxPrice("");
    setActiveOnly(false);
    setPage(1);
    setParams({ page: 1, pageSize: PAGE_SIZE });
  }

  async function handleToggleFeatured(item: ProductListItem) {
    if (!data) return;
    try {
      await productsApi.setFeatured(item.id, !item.isFeatured);
      setData({
        ...data,
        items: data.items.map((p) => (p.id === item.id ? { ...p, isFeatured: !p.isFeatured } : p)),
      });
    } catch {
      /* noop */
    }
  }

  async function handleDeactivate(item: ProductListItem) {
    if (!data) return;
    const title = item.translatedTitle ?? item.originalTitle;
    if (!confirm(t("product.deactivate_confirm", { title }))) return;
    try {
      await productsApi.deactivate(item.id);
      setData({
        ...data,
        items: data.items.filter((p) => p.id !== item.id),
        totalCount: data.totalCount - 1,
      });
    } catch {
      /* noop */
    }
  }

  const flatCategories = flattenTree(options.data?.categories ?? []);
  const platforms = options.data?.platforms ?? [];
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <FadeIn className="space-y-6">
      <SectionHeader
        title={t("product.manage")}
        subtitle={t("product.all_count", { count: totalCount })}
      />

      {/* Filter bar */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
      >
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input
            label={t("common.search")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("product.search_placeholder")}
            className="md:col-span-2"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t("product.filter_category")}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("product.all_categories")}</option>
              {flatCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prefix}
                  {c.nameVn}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t("product.filter_platform")}</label>
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("product.all_platforms")}</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Input
            label={t("product.min_price")}
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
            className="w-36"
          />
          <Input
            label={t("product.max_price")}
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="9999"
            className="w-36"
          />
          <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("product.active_only")}
          </label>
          <div className="ml-auto flex gap-2 pb-1">
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              {t("common.reset")}
            </Button>
            <Button type="submit" size="sm" loading={loading} className="gap-1.5">
              <Funnel size={16} weight="bold" />
              {t("common.search")}
            </Button>
          </div>
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <SkeletonPanel rows={8} cols={7} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title={t("product.no_results")}
          hint={t("product.empty_hint", "Thử từ khoá khác hoặc bỏ bớt bộ lọc.")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">{t("product.col_product")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("product.col_platform_shop")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("product.col_price")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("product.col_variants")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.primaryImageUrl ? (
                          <img
                            src={item.primaryImageUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <ImageIcon size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p
                            className="truncate font-medium text-slate-900"
                            title={item.translatedTitle ?? item.originalTitle}
                          >
                            {item.translatedTitle ?? item.originalTitle}
                          </p>
                          {item.translatedTitle && (
                            <p className="truncate text-xs text-slate-400" title={item.originalTitle}>
                              {item.originalTitle}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">{item.platformName}</p>
                      <p className="text-xs text-slate-400">{item.shopName}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {item.minPriceCny === item.maxPriceCny
                        ? formatCNY(item.minPriceCny)
                        : `${formatCNY(item.minPriceCny)} – ${formatCNY(item.maxPriceCny)}`}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{item.variantCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.isFeatured && <Badge variant="info">{t("product.featured_badge")}</Badge>}
                        {item.isForbidden && <Badge variant="error">{t("product.forbidden_badge")}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleFeatured(item)}
                          title={item.isFeatured ? t("product.toggle_featured_off") : t("product.toggle_featured_on")}
                          className={cn(
                            "rounded-lg p-1.5 transition active:scale-95",
                            item.isFeatured
                              ? "bg-amber-100 text-amber-600 hover:bg-amber-200"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-amber-500"
                          )}
                        >
                          <Star size={16} weight={item.isFeatured ? "fill" : "regular"} />
                        </button>
                        <Link
                          to={`/admin/products/${item.id}`}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-primary hover:text-white active:scale-95"
                          title={t("product.view_detail")}
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          onClick={() => handleDeactivate(item)}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                          title={t("product.deactivate")}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t("product.pagination", { page, total: totalPages, count: totalCount })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
              className="gap-1"
            >
              <CaretLeft size={14} weight="bold" />
              {t("product.prev_page")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePage(page + 1)}
              className="gap-1"
            >
              {t("product.next_page")}
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      )}
    </FadeIn>
  );
}

function flattenTree(
  nodes: CategoryTree[],
  depth = 0
): Array<CategoryTree & { prefix: string }> {
  return nodes.flatMap((c) => [
    { ...c, prefix: "　".repeat(depth) },
    ...flattenTree(c.children ?? [], depth + 1),
  ]);
}
