import { useState } from "react";
import { useTranslation } from "react-i18next";
import { customerComplaintApi } from "~/lib/api/staff";
import { Button } from "~/components/ui/Button";
import { Modal } from "~/components/ui/Modal";
import { WarningCircle, CheckCircle } from "~/components/shared/icons";
import type { OrderDetailResponse } from "~/lib/types/order";
import type { ComplaintType } from "~/lib/types/staff";

const TYPES: ComplaintType[] = ["WrongItem", "Damaged", "Missing", "NotAsDescribed", "Late", "Other"];

export function ComplaintButton({ order }: { order: OrderDetailResponse }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ComplaintType>("WrongItem");
  const [orderItemId, setOrderItemId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const evidenceUrls = evidence.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      await customerComplaintApi.submit(order.id, {
        type,
        description: description.trim(),
        orderItemId: orderItemId || null,
        evidenceUrls,
      });
      setDone(true);
      setDescription("");
      setEvidence("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setOpen(true); setDone(false); }}>
        <WarningCircle size={16} weight="bold" />
        {t("complaint.btn")}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} maxWidth="md" title={t("complaint.modal_title")}>
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle size={48} weight="fill" className="mx-auto text-emerald-500" />
            <p className="mt-3 text-sm text-gray-700">{t("complaint.submitted")}</p>
            <Button className="mt-4" size="sm" onClick={() => setOpen(false)}>{t("common.close")}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("complaint.field_type")}</label>
              <select value={type} onChange={(e) => setType(e.target.value as ComplaintType)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                {TYPES.map((ty) => (
                  <option key={ty} value={ty}>{t(`complaint.type_${ty}`, ty)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("complaint.field_item")}</label>
              <select value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="">{t("complaint.whole_order")}</option>
                {order.items.map((it) => (
                  <option key={it.id} value={it.id}>{it.productTitle.slice(0, 40)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("complaint.field_desc")} <span className="text-red-500">*</span>
              </label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t("complaint.desc_ph")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("complaint.field_evidence")}</label>
              <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} placeholder={t("complaint.evidence_ph")} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <p className="mt-1 text-xs text-gray-400">{t("complaint.evidence_hint")}</p>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit" loading={submitting}>{t("complaint.submit")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
