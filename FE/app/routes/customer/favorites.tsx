import { useTranslation } from "react-i18next";
import { favoritesApi } from "~/lib/api/engagement";
import { useFetch } from "~/lib/hooks/useFetch";
import { ProductCard } from "~/components/customer/ProductCard";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { Skeleton } from "~/components/shared/Skeleton";
import { FadeIn, Stagger, StaggerItem } from "~/components/shared/Motion";
import { Heart, WarningCircle } from "~/components/shared/icons";
import type { ProductListItem } from "~/lib/types/product";

export function meta() {
  return [{ title: "Yêu thích — MuaHo" }];
}

export default function FavoritesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useFetch<ProductListItem[]>(
    async () => (await favoritesApi.list()).data,
    []
  );

  const items = data ?? [];

  return (
    <FadeIn className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <SectionHeader
        title={t("favorites.title")}
        subtitle={data ? t("favorites.count", { count: items.length }) : t("favorites.subtitle")}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Heart size={40} />} title={t("favorites.empty")} hint={t("favorites.empty_hint")} />
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </FadeIn>
  );
}
