import { useTranslation } from "react-i18next";
import { useRecommend } from "~/lib/stores/recommendStore";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { cn } from "~/lib/utils/cn";

// Các dải gợi ý (trending / similar_to_viewed / for_you / also_viewed ...) — dùng cache zustand.
export function RecommendationSections({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data, loading } = useRecommend();

  if (loading && !data) {
    return (
      <div className={cn("space-y-3", className)}>
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-44 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sections = (data?.sections ?? []).filter((s) => s.products.length > 0);
  if (sections.length === 0) return null;

  const segment = data?.segment;
  const segmentLabel = segment ? t(`recommend.segment_${segment}`, RECOMMEND_SEGMENT[segment] ?? "") : "";

  return (
    <FadeIn className={cn("space-y-8", className)}>
      {segmentLabel && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
              SEGMENT_STYLE[segment!] ?? SEGMENT_STYLE.first_time,
            )}
          >
            {segmentLabel}
          </span>
          <span className="text-xs text-slate-500">
            {t("recommend.personalized_note", "Gợi ý được cá nhân hoá theo hoạt động của bạn")}
          </span>
        </div>
      )}
      {sections.map((s) => (
        <section key={s.key}>
          <h2 className="mb-3 font-heading text-lg font-bold tracking-tight text-slate-900">
            {t(`recommend.${s.key}`, RECOMMEND_FALLBACK[s.key] ?? "Gợi ý cho bạn")}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {s.products.map((p) => (
              <div key={p.id} className="w-44 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </FadeIn>
  );
}

export const RECOMMEND_FALLBACK: Record<string, string> = {
  trending: "Đang thịnh hành",
  featured: "Nổi bật",
  recently_viewed: "Bạn đã xem gần đây",
  similar_to_viewed: "Giống thứ bạn đã xem",
  also_viewed: "Người xem cũng xem",
  for_you: "Gợi ý cho bạn",
};

// Phân khúc khách do backend trả về (RecommendationResponse.segment).
export const RECOMMEND_SEGMENT: Record<string, string> = {
  first_time: "Khách mới",
  returning: "Khách quen",
  loyal: "Khách thân thiết",
};

const SEGMENT_STYLE: Record<string, string> = {
  first_time: "bg-slate-100 text-slate-600 ring-slate-200",
  returning: "bg-sky-50 text-sky-700 ring-sky-200",
  loyal: "bg-amber-50 text-amber-700 ring-amber-200",
};
