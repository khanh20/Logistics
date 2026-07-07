import { useState } from "react";
import { useTranslation } from "react-i18next";
import { reviewsApi } from "~/lib/api/engagement";
import { useFetch } from "~/lib/hooks/useFetch";
import { store } from "~/lib/feature/store";
import { Button } from "~/components/ui/Button";
import { Badge, type BadgeVariant } from "~/components/ui/Badge";
import { StarIcon, ChatCircleText } from "~/components/shared/icons";
import { EmptyState } from "~/components/shared/Panels";
import { SkeletonCards } from "~/components/shared/Skeleton";
import { formatDate } from "~/lib/utils/format";
import type { PagedReviewResponse, ReviewResponse, ReviewStatus } from "~/lib/types/engagement";

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          size={size}
          weight={i <= value ? "fill" : "regular"}
          className={i <= value ? "text-amber-400" : "text-slate-300"}
        />
      ))}
    </span>
  );
}

const STATUS_VARIANT: Record<ReviewStatus, BadgeVariant> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
};

export function ProductReviews({ productId }: { productId: string }) {
  const { t } = useTranslation();
  const token = store.getState().authState.token;

  const { data, loading, reload } = useFetch<{ list: PagedReviewResponse; mine: ReviewResponse | null }>(
    async () => {
      const approvedRes = await reviewsApi.getApproved(productId, 1, 20);
      let mine: ReviewResponse | null = null;
      if (token) {
        try {
          mine = (await reviewsApi.getMine(productId)).data;
        } catch {
          /* noop */
        }
      }
      return { list: approvedRes.data, mine };
    },
    [productId]
  );

  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await reviewsApi.submit(productId, { rating, content: content.trim() });
      setContent("");
      reload();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const list = data?.list;
  const mine = data?.mine ?? null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-1.5 font-heading text-base font-semibold text-slate-800">
        <ChatCircleText size={18} weight="bold" />
        {t("reviews.title")}
        {list && list.totalCount > 0 && (
          <span className="text-sm font-normal text-slate-400">({list.totalCount})</span>
        )}
      </h2>

      {/* Đánh giá của chính khách (gồm Pending) */}
      {mine && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <Stars value={mine.rating} />
            <Badge variant={STATUS_VARIANT[mine.status]}>{t(`reviews.status_${mine.status.toLowerCase()}`)}</Badge>
          </div>
          <p className="mt-1 text-slate-700">{mine.content}</p>
          {mine.status === "Rejected" && mine.rejectReason && (
            <p className="mt-1 text-xs text-red-600">{mine.rejectReason}</p>
          )}
        </div>
      )}

      {/* Form gửi đánh giá (đăng nhập + chưa gửi) */}
      {token && !mine && (
        <form onSubmit={submit} className="mb-5 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-medium text-slate-700">{t("reviews.write")}</p>
          <div className="mb-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button type="button" key={i} onClick={() => setRating(i)} className="active:scale-90">
                <StarIcon
                  size={22}
                  weight={i <= rating ? "fill" : "regular"}
                  className={i <= rating ? "text-amber-400" : "text-slate-300"}
                />
              </button>
            ))}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder={t("reviews.placeholder")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">{t("reviews.purchase_hint")}</p>
            <Button type="submit" size="sm" loading={submitting} disabled={!content.trim()}>
              {t("reviews.submit")}
            </Button>
          </div>
        </form>
      )}

      {/* Danh sách đã duyệt */}
      {loading && !data ? (
        <SkeletonCards count={3} />
      ) : !list || list.items.length === 0 ? (
        <EmptyState icon={<ChatCircleText size={36} />} title={t("reviews.empty")} />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
          {list.items.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
