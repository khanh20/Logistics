import { ProductCard } from "./ProductCard";
import { useRecommend, pickRailProducts } from "~/lib/stores/recommendStore";
import { cn } from "~/lib/utils/cn";

// Banner sản phẩm dạng quảng cáo ở 2 bên (chỉ hiện trên màn rộng xl+) — dùng cache recommend.
export function ProductRail({
  sectionKeys,
  title,
  tagline,
  className,
  tail = false,
}: {
  sectionKeys: string[];
  title: string;
  tagline?: string;
  className?: string;
  tail?: boolean;
}) {
  const { data } = useRecommend();
  const products = pickRailProducts(data, sectionKeys, { count: 3, tail });
  if (products.length === 0) return null;

  return (
    <aside className={cn("hidden w-52 shrink-0 xl:block", className)}>
      <div className="sticky top-20 space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-amber-100/50 p-3">
          <p className="font-heading text-sm font-bold leading-tight text-slate-900">{title}</p>
          {tagline && <p className="mt-0.5 text-[11px] text-slate-500">{tagline}</p>}
        </div>
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </aside>
  );
}
