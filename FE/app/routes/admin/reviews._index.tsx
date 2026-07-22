import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { reviewsApi } from "~/lib/api/engagement";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { Modal } from "~/components/ui/Modal";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn, Stagger, StaggerItem } from "~/components/shared/Motion";
import {
  CheckCircle, X, StarIcon, ChatCircleText, ArrowClockwise, WarningCircle, ArrowRight,
} from "~/components/shared/icons";
import { formatDate } from "~/lib/utils/format";
import type { PagedReviewResponse, ReviewResponse } from "~/lib/types/engagement";

export function meta() {
  return [{ title: "Kiểm duyệt đánh giá — MuaHo Admin" }];
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={15} weight={i <= value ? "fill" : "regular"} className={i <= value ? "text-amber-400" : "text-slate-300"} />
      ))}
    </span>
  );
}

// productLinkBase: bỏ trống thì ẩn link "Xem sản phẩm" — portal nhân viên không có
// màn hình sản phẩm, mà /admin/products lại bị admin-layout đá ra.
export function ReviewsModerationView({ productLinkBase }: { productLinkBase?: string }) {
  const { t } = useTranslation();
  const { data, loading, error, setData, reload } = useFetch<PagedReviewResponse>(
    async () => (await reviewsApi.getQueue("Pending", 1, 50)).data,
    []
  );

  const [rejectTarget, setRejectTarget] = useState<ReviewResponse | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function removeRow(id: string) {
    if (!data) return;
    setData({ ...data, items: data.items.filter((x) => x.id !== id), totalCount: data.totalCount - 1 });
  }

  async function approve(r: ReviewResponse) {
    setBusyId(r.id);
    try {
      await reviewsApi.moderate(r.id, { approve: true });
      removeRow(r.id);
    } catch {
      /* noop */
    } finally {
      setBusyId(null);
    }
  }

  async function doReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await reviewsApi.moderate(rejectTarget.id, { approve: false, reason: reason.trim() || undefined });
      removeRow(rejectTarget.id);
      setRejectTarget(null);
      setReason("");
    } catch {
      /* noop */
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <FadeIn className="space-y-6">
      <SectionHeader
        title={t("admin_reviews.title")}
        subtitle={data ? t("admin_reviews.pending_count", { count: data.totalCount }) : undefined}
        action={
          <Button variant="secondary" size="sm" onClick={reload} className="gap-1.5">
            <ArrowClockwise size={16} weight="bold" />
            {t("common.refresh", "Tải lại")}
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <SkeletonPanel rows={6} cols={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ChatCircleText size={40} />} title={t("admin_reviews.empty")} />
      ) : (
        <Stagger className="space-y-2">
          {items.map((r) => (
            <StaggerItem key={r.id}>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{r.content}</p>
                  {productLinkBase && (
                    <Link
                      to={`${productLinkBase}/${r.productId}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t("admin_reviews.view_product", "Xem sản phẩm")}
                      <ArrowRight size={12} weight="bold" />
                    </Link>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" loading={busyId === r.id} onClick={() => approve(r)} className="gap-1.5">
                    <CheckCircle size={15} weight="fill" />
                    {t("admin_reviews.approve", "Duyệt")}
                  </Button>
                  <Button variant="danger" size="sm" disabled={busyId === r.id} onClick={() => setRejectTarget(r)} className="gap-1.5">
                    <X size={15} weight="bold" />
                    {t("admin_reviews.reject", "Từ chối")}
                  </Button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t("admin_reviews.reject_title", "Từ chối đánh giá")}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{t("admin_reviews.reject_hint", "Lý do từ chối (gửi cho khách):")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={t("admin_reviews.reject_placeholder", "VD: nội dung không phù hợp...")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" size="sm" loading={busyId === rejectTarget?.id} onClick={doReject}>
              {t("admin_reviews.reject", "Từ chối")}
            </Button>
          </div>
        </div>
      </Modal>
    </FadeIn>
  );
}

export default function AdminReviewsPage() {
  return <ReviewsModerationView productLinkBase="/admin/products" />;
}
