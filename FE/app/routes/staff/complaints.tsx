import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { staffComplaintApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { Badge, type BadgeVariant } from "~/components/ui/Badge";
import { Modal } from "~/components/ui/Modal";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { ChatCircleDots, Tray, CheckCircle, Prohibit } from "~/components/shared/icons";
import { formatVND, formatDate } from "~/lib/utils/format";
import type { ComplaintQueueResult, ComplaintResponse } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Khiếu nại — MuaHo CSKH" }];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  New: "warning", InReview: "info", AwaitingCustomer: "default", Resolved: "success", Rejected: "error",
};

export default function StaffComplaintsPage() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useFetch<ComplaintQueueResult>(
    () => staffComplaintApi.getQueue({ page: 1, pageSize: 50 }).then((r) => r.data as ComplaintQueueResult),
    []
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [modal, setModal] = useState<{ mode: "resolve" | "reject"; c: ComplaintResponse } | null>(null);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function assign(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await staffComplaintApi.assignToMe(id);
      reload();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  async function submitModal() {
    if (!modal || !text.trim()) return;
    setSubmitting(true);
    try {
      if (modal.mode === "resolve") {
        await staffComplaintApi.resolve(modal.c.id, { resolution: text.trim(), resolvedAmountVnd: amount.trim() ? Number(amount) : null });
      } else {
        await staffComplaintApi.reject(modal.c.id, { reason: text.trim() });
      }
      setModal(null); setText(""); setAmount("");
      reload();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  const items = data?.items ?? [];

  return (
    <FadeIn className="max-w-6xl space-y-5">
      <SectionHeader title={t("complaint.queue_title")} subtitle={t("complaint.queue_subtitle")} />

      {(actionError || error) && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError ?? error}</div>}

      {loading && !data ? (
        <SkeletonPanel rows={6} cols={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ChatCircleDots size={40} />} title={t("complaint.queue_empty")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                {[
                  t("complaint.col_order"), t("complaint.col_type"), t("complaint.col_desc"),
                  t("complaint.col_status"), t("complaint.col_assignee"), t("complaint.col_actions"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => {
                const busy = busyId === c.id;
                const closed = c.status === "Resolved" || c.status === "Rejected";
                return (
                  <tr key={c.id} className="align-top transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${c.orderId}`} className="font-mono text-primary hover:underline">{c.orderCode}</Link>
                      <p className="text-xs text-slate-400">{formatDate(c.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t(`complaint.type_${c.type}`, c.type)}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      <p className="line-clamp-2">{c.description}</p>
                      {c.evidenceUrls.length > 0 && <p className="mt-0.5 text-xs text-blue-500">{c.evidenceUrls.length} {t("complaint.evidence")}</p>}
                      {c.resolution && <p className="mt-1 text-xs text-slate-500">→ {c.resolution}{c.resolvedAmountVnd ? ` (${formatVND(c.resolvedAmountVnd)})` : ""}</p>}
                    </td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[c.status] ?? "default"}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-600">{c.assignedToStaffName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {!closed && (
                        <div className="flex flex-wrap gap-1.5">
                          {!c.assignedToStaffId && (
                            <Button size="sm" loading={busy} onClick={() => assign(c.id)}>
                              <Tray size={15} weight="bold" /> {t("complaint.assign_me")}
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => { setModal({ mode: "resolve", c }); setText(""); setAmount(""); }}>
                            <CheckCircle size={15} weight="bold" /> {t("complaint.resolve")}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => { setModal({ mode: "reject", c }); setText(""); }}>
                            <Prohibit size={15} weight="bold" /> {t("complaint.reject")}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        maxWidth="md"
        title={modal ? `${modal.mode === "resolve" ? t("complaint.resolve_title") : t("complaint.reject_title")} — ${modal.c.orderCode}` : undefined}
      >
        {modal && (
          <div className="space-y-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder={modal.mode === "resolve" ? t("complaint.resolution_ph") : t("complaint.reason_ph")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            {modal.mode === "resolve" && (
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder={t("complaint.refund_ph")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(null)}>{t("common.cancel")}</Button>
              <Button loading={submitting} onClick={submitModal}>{t("common.save")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </FadeIn>
  );
}
