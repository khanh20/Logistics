import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/products._index";
import { productsApi } from "~/lib/api/products";
import { categoriesApi } from "~/lib/api/categories";
import { platformsApi } from "~/lib/api/platforms";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { cn } from "~/lib/utils/cn";
import { formatCNY } from "~/lib/utils/format";
import type { ProductListItem, PagedProductResponse, ProductSearchParams } from "~/lib/types/product";
import type { CategoryTree } from "~/lib/types/category";
import type { PlatformSlim } from "~/lib/types/platform";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý sản phẩm — MuaHo Admin" }];
}

export async function clientLoader() {
  const [productsRes, categoriesRes, platformsRes] = await Promise.all([
    productsApi.search({ page: 1, pageSize: 20 }),
    categoriesApi.getTree(),
    platformsApi.getAllActive(),
  ]);
  return {
    initial: productsRes.data,
    categories: categoriesRes.data,
    platforms: platformsRes.data,
  };
}

type LoaderData = {
  initial: PagedProductResponse;
  categories: CategoryTree[];
  platforms: PlatformSlim[];
};

export default function ProductsPage({ loaderData }: { loaderData: LoaderData }) {
  const { t } = useTranslation();
  const [data, setData] = useState(loaderData.initial);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const doSearch = useCallback(async (params: ProductSearchParams) => {
    setLoading(true);
    try {
      const res = await productsApi.search({ pageSize: 20, ...params });
      setData(res.data);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  function buildParams(overridePage?: number): ProductSearchParams {
    return {
      keyword: keyword.trim() || undefined,
      categoryId: categoryId || undefined,
      platformId: platformId || undefined,
      minPriceCny: minPrice ? parseFloat(minPrice) : undefined,
      maxPriceCny: maxPrice ? parseFloat(maxPrice) : undefined,
      activeOnly: activeOnly || undefined,
      page: overridePage ?? page,
    };
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await doSearch(buildParams(1));
  }

  async function handlePage(newPage: number) {
    setPage(newPage);
    await doSearch(buildParams(newPage));
  }

  async function handleReset() {
    setKeyword("");
    setCategoryId("");
    setPlatformId("");
    setMinPrice("");
    setMaxPrice("");
    setActiveOnly(false);
    setPage(1);
    await doSearch({ page: 1, pageSize: 20 });
  }

  async function handleToggleFeatured(item: ProductListItem) {
    try {
      await productsApi.setFeatured(item.id, !item.isFeatured);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((p) =>
          p.id === item.id ? { ...p, isFeatured: !p.isFeatured } : p
        ),
      }));
    } catch {
      /* noop */
    }
  }

  async function handleDeactivate(item: ProductListItem) {
    const title = item.translatedTitle ?? item.originalTitle;
    if (!confirm(t("product.deactivate_confirm", { title }))) return;
    try {
      await productsApi.deactivate(item.id);
      setData((prev) => ({
        ...prev,
        items: prev.items.filter((p) => p.id !== item.id),
        totalCount: prev.totalCount - 1,
      }));
    } catch {
      /* noop */
    }
  }

  const flatCategories = flattenTree(loaderData.categories);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("product.manage")}</h1>
        <span className="text-sm text-gray-500">
          {t("product.all_count", { count: data.totalCount })}
        </span>
      </div>

      {/* Filter bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Input
            label={t("common.search")}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("product.search_placeholder")}
            className="md:col-span-2"
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              {t("product.filter_category")}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
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
            <label className="text-xs font-medium text-gray-600">
              {t("product.filter_platform")}
            </label>
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("product.all_platforms")}</option>
              {loaderData.platforms.map((p) => (
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
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("product.active_only")}
          </label>
          <div className="flex gap-2 ml-auto pb-1">
            <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
              {t("common.reset")}
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              {t("common.search")}
            </Button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">{t("product.col_product")}</th>
              <th className="px-4 py-3 text-left">{t("product.col_platform_shop")}</th>
              <th className="px-4 py-3 text-right">{t("product.col_price")}</th>
              <th className="px-4 py-3 text-center">{t("product.col_variants")}</th>
              <th className="px-4 py-3 text-left">{t("common.status")}</th>
              <th className="px-4 py-3 text-center">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {(page - 1) * 20 + idx + 1}
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <div className="flex items-center gap-3">
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt=""
                        className="w-10 h-10 object-cover rounded-lg shrink-0 bg-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                    <div className="min-w-0">
                      <p
                        className="font-medium text-gray-900 truncate"
                        title={item.translatedTitle ?? item.originalTitle}
                      >
                        {item.translatedTitle ?? item.originalTitle}
                      </p>
                      {item.translatedTitle && (
                        <p className="text-xs text-gray-400 truncate" title={item.originalTitle}>
                          {item.originalTitle}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-700">{item.platformName}</p>
                  <p className="text-xs text-gray-400">{item.shopName}</p>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-800 whitespace-nowrap">
                  {item.minPriceCny === item.maxPriceCny
                    ? formatCNY(item.minPriceCny)
                    : `${formatCNY(item.minPriceCny)} – ${formatCNY(item.maxPriceCny)}`}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{item.variantCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.isFeatured && (
                      <Badge variant="info">{t("product.featured_badge")}</Badge>
                    )}
                    {item.isForbidden && (
                      <Badge variant="error">{t("product.forbidden_badge")}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleToggleFeatured(item)}
                      title={
                        item.isFeatured
                          ? t("product.toggle_featured_off")
                          : t("product.toggle_featured_on")
                      }
                      className={cn(
                        "p-1.5 rounded-lg transition-colors text-base leading-none",
                        item.isFeatured
                          ? "bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-yellow-500"
                      )}
                    >
                      ★
                    </button>
                    <Link
                      to={`/admin/products/${item.id}`}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-primary hover:text-white transition-colors text-sm leading-none"
                      title={t("product.view_detail")}
                    >
                      👁
                    </Link>
                    <button
                      onClick={() => handleDeactivate(item)}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors text-sm leading-none"
                      title={t("product.deactivate")}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.items.length === 0 && !loading && (
          <p className="text-center text-gray-400 py-12">{t("product.no_results")}</p>
        )}
        {loading && (
          <p className="text-center text-gray-400 py-12">{t("common.loading")}</p>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {t("product.pagination", {
              page,
              total: data.totalPages,
              count: data.totalCount,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
            >
              {t("product.prev_page")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= data.totalPages || loading}
              onClick={() => handlePage(page + 1)}
            >
              {t("product.next_page")}
            </Button>
          </div>
        </div>
      )}
    </div>
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
