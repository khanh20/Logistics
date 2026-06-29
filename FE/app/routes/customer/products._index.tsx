import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/products._index";
import { productsApi } from "~/lib/api/products";
import { categoriesApi } from "~/lib/api/categories";
import { platformsApi } from "~/lib/api/platforms";
import { ProductCard } from "~/components/customer/ProductCard";
import { ProductFilters, type ProductFilterValues } from "~/components/customer/ProductFilters";
import { RecommendationSections } from "~/components/customer/RecommendationSections";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { Skeleton } from "~/components/shared/Skeleton";
import { FadeIn, Stagger, StaggerItem } from "~/components/shared/Motion";
import { Button } from "~/components/ui/Button";
import { Package, CaretLeft, CaretRight, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import type { PagedProductResponse, ProductSearchParams, ProductSort } from "~/lib/types/product";
import type { CategoryTree } from "~/lib/types/category";
import type { PlatformSlim } from "~/lib/types/platform";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tìm kiếm sản phẩm — MuaHo" }];
}

const PAGE_SIZE = 24;

export default function CustomerProductsPage() {
  const { t } = useTranslation();
  const [sp, setSp] = useSearchParams();
  const spKey = sp.toString();

  // Bộ lọc/đk hiện tại lấy từ URL → share link, back/forward hoạt động.
  const params: ProductSearchParams = useMemo(
    () => ({
      keyword: sp.get("keyword") || undefined,
      categoryId: sp.get("categoryId") || undefined,
      platformId: sp.get("platformId") || undefined,
      minPriceCny: sp.get("min") ? Number(sp.get("min")) : undefined,
      maxPriceCny: sp.get("max") ? Number(sp.get("max")) : undefined,
      sort: (sp.get("sort") as ProductSort) || undefined,
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      pageSize: PAGE_SIZE,
      activeOnly: true,
    }),
    [spKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Tuỳ chọn lọc (load 1 lần).
  const options = useFetch<{ categories: CategoryTree[]; platforms: PlatformSlim[] }>(async () => {
    const [cat, plat] = await Promise.all([categoriesApi.getTree(), platformsApi.getAllActive()]);
    return { categories: cat.data, platforms: plat.data };
  }, []);

  // Kết quả tìm kiếm (reload khi URL đổi) — non-blocking.
  const { data, loading, error } = useFetch<PagedProductResponse>(
    async () => (await productsApi.search(params)).data,
    [spKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function applyFilters(v: ProductFilterValues) {
    const next = new URLSearchParams();
    if (v.keyword.trim()) next.set("keyword", v.keyword.trim());
    if (v.categoryId) next.set("categoryId", v.categoryId);
    if (v.platformId) next.set("platformId", v.platformId);
    if (v.minPrice) next.set("min", v.minPrice);
    if (v.maxPrice) next.set("max", v.maxPrice);
    if (v.sort && v.sort !== "Relevance") next.set("sort", v.sort);
    next.set("page", "1");
    setSp(next);
  }

  function resetFilters() {
    setSp(new URLSearchParams());
  }

  function goPage(p: number) {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    setSp(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const initialFilter: ProductFilterValues = {
    keyword: sp.get("keyword") ?? "",
    categoryId: sp.get("categoryId") ?? "",
    platformId: sp.get("platformId") ?? "",
    minPrice: sp.get("min") ?? "",
    maxPrice: sp.get("max") ?? "",
    sort: (sp.get("sort") as ProductSort) ?? "Relevance",
  };

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  return (
    <FadeIn className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <SectionHeader
        title={t("products.title")}
        subtitle={data ? t("products.results", { count: totalCount }) : t("products.subtitle")}
      />

      <ProductFilters
        key={spKey}
        initial={initialFilter}
        categories={options.data?.categories ?? []}
        platforms={options.data?.platforms ?? []}
        loading={loading}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {!sp.get("keyword") && <RecommendationSections />}

      {loading && !data ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Package size={40} />}
          title={t("products.empty_title")}
          hint={t("products.empty_hint")}
        />
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t("products.pagination", { page, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => goPage(page - 1)} className="gap-1">
              <CaretLeft size={14} weight="bold" />
              {t("common.prev_page")}
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => goPage(page + 1)} className="gap-1">
              {t("common.next_page")}
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      )}
    </FadeIn>
  );
}

// Skeleton khớp lưới sản phẩm (taste-skill: skeleton đúng layout).
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
