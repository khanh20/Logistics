import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { MagnifyingGlass, Funnel, ArrowClockwise } from "~/components/shared/icons";
import type { ProductSort } from "~/lib/types/product";
import type { CategoryTree } from "~/lib/types/category";
import type { PlatformSlim } from "~/lib/types/platform";

export interface ProductFilterValues {
  keyword: string;
  categoryId: string;
  platformId: string;
  minPrice: string;
  maxPrice: string;
  sort: ProductSort;
}

const SORT_OPTIONS: ProductSort[] = [
  "Relevance",
  "PriceAsc",
  "PriceDesc",
  "Newest",
  "BestSelling",
  "MostViewed",
];

// Bộ lọc tìm kiếm sản phẩm — giữ draft state riêng, chỉ áp dụng khi bấm "Lọc".
export function ProductFilters({
  initial,
  categories,
  platforms,
  loading,
  onApply,
  onReset,
}: {
  initial: ProductFilterValues;
  categories: CategoryTree[];
  platforms: PlatformSlim[];
  loading?: boolean;
  onApply: (v: ProductFilterValues) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProductFilterValues>(initial);

  function set<K extends keyof ProductFilterValues>(key: K, value: ProductFilterValues[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onApply(draft);
  }

  function handleReset() {
    const empty: ProductFilterValues = {
      keyword: "",
      categoryId: "",
      platformId: "",
      minPrice: "",
      maxPrice: "",
      sort: "Relevance",
    };
    setDraft(empty);
    onReset();
  }

  const flatCategories = flattenTree(categories);

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      {/* Search box */}
      <div className="relative">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={draft.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          placeholder={t("products.search_placeholder")}
          className="h-11 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filters grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">{t("products.filter_category")}</label>
          <select
            value={draft.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t("products.all_categories")}</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prefix}
                {c.nameVn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">{t("products.filter_platform")}</label>
          <select
            value={draft.platformId}
            onChange={(e) => set("platformId", e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{t("products.all_platforms")}</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">{t("products.sort_label")}</label>
          <select
            value={draft.sort}
            onChange={(e) => set("sort", e.target.value as ProductSort)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {t(`products.sort_${s.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Input
            label={t("products.price_from")}
            type="number"
            min="0"
            value={draft.minPrice}
            onChange={(e) => set("minPrice", e.target.value)}
            placeholder="¥0"
          />
          <Input
            label={t("products.price_to")}
            type="number"
            min="0"
            value={draft.maxPrice}
            onChange={(e) => set("maxPrice", e.target.value)}
            placeholder="¥∞"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleReset} className="gap-1.5">
          <ArrowClockwise size={15} weight="bold" />
          {t("common.reset")}
        </Button>
        <Button type="submit" size="sm" loading={loading} className="gap-1.5">
          <Funnel size={15} weight="bold" />
          {t("products.apply")}
        </Button>
      </div>
    </form>
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
