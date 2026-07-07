import { useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import { SlaCountdown } from "~/components/admin/SlaCountdown";
import { Button } from "~/components/ui/Button";
import { Badge, type BadgeVariant } from "~/components/ui/Badge";
import { EmptyState } from "~/components/shared/Panels";
import { Skeleton } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import {
  ArrowLeft, CheckCircle, PlayCircle, CheckSquare, ArrowRight,
  ChatCircleDots, PaperPlaneTilt,
} from "~/components/shared/icons";
import { formatVND, formatDate } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { StaffQueueItemDto, SupplierChatLogDto } from "~/lib/types/staff";

export function meta() {
  return [{ title: "Chi tiết phân công — MuaHo" }];
}

interface DetailData {
  assignment: StaffQueueItemDto | null;
  chat: SupplierChatLogDto[];
}

async function loadDetail(id: string): Promise<DetailData> {
  const queueRes = await staffPortalApi.getMyQueue(true);
  const queue = (queueRes.data as StaffQueueItemDto[]) ?? [];
  const assignment = queue.find((q) => q.assignmentId === id) ?? null;
  let chat: SupplierChatLogDto[] = [];
  if (assignment) {
    try {
      const chatRes = await staffPortalApi.getSupplierChat(assignment.orderId);
      chat = (chatRes.data as SupplierChatLogDto[]) ?? [];
    } catch { /* ignore */ }
  }
  return { assignment, chat };
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Assigned: "warning", Accepted: "info", InProgress: "info",
  Done: "success", Reassigned: "default", Cancelled: "error",
};

export default function StaffAssignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { data, loading, reload } = useFetch<DetailData>(() => loadDetail(id!), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [direction, setDirection] = useState("Sent");
  const [message, setMessage] = useState("");
  const [tool, setTool] = useState("");
  const [sending, setSending] = useState(false);

  const a = data?.assignment ?? null;

  async function act(action: "accept" | "start" | "complete") {
    setBusy(true);
    setError(null);
    try {
      await staffPortalApi[action](id!);
      reload();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || !a) return;
    setSending(true);
    try {
      await staffPortalApi.addSupplierChat(a.orderId, {
        direction, message: message.trim(), platformChatTool: tool.trim() || null,
      });
      setMessage("");
      reload();
    } finally {
      setSending(false);
    }
  }

  return (
    <FadeIn className="max-w-3xl space-y-6">
      <Link to="/staff/assignments" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft size={15} /> {t("staff_portal.back_queue")}
      </Link>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading && !data ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !a ? (
        <EmptyState icon={<ChatCircleDots size={40} />} title={t("staff_portal.assignment_not_found")} />
      ) : (
        <>
          {/* Header */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="font-mono text-xl font-bold text-slate-900">{a.orderCode}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {a.orderStatusLabel} · {a.itemCount} {t("staff_portal.items")} ·{" "}
                  <span className="tabular-nums">{formatVND(a.finalAmountVnd)}</span>
                </p>
              </div>
              <SlaCountdown deadline={a.slaDeadline} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {a.assignmentStatus === "Assigned" && (
                <Button size="sm" loading={busy} onClick={() => act("accept")}>
                  <CheckCircle size={16} weight="bold" /> {t("staff_portal.accept")}
                </Button>
              )}
              {a.assignmentStatus === "Accepted" && (
                <Button size="sm" loading={busy} onClick={() => act("start")}>
                  <PlayCircle size={16} weight="bold" /> {t("staff_portal.start")}
                </Button>
              )}
              {(a.assignmentStatus === "InProgress" || a.assignmentStatus === "Accepted") && (
                <Button size="sm" variant="secondary" loading={busy} onClick={() => act("complete")}>
                  <CheckSquare size={16} weight="bold" /> {t("staff_portal.complete")}
                </Button>
              )}
              <Link to={`/staff/orders/${a.orderId}`}>
                <Button size="sm" variant="ghost">{t("staff_portal.process")} <ArrowRight size={15} /></Button>
              </Link>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-slate-100 pt-4 text-sm">
              <dt className="text-slate-500">{t("staff_portal.assign_status")}</dt>
              <dd><Badge variant={STATUS_VARIANT[a.assignmentStatus] ?? "default"}>{a.assignmentStatus}</Badge></dd>
              <dt className="text-slate-500">{t("staff_portal.assigned_at")}</dt>
              <dd className="tabular-nums text-slate-800">{formatDate(a.assignedAt)}</dd>
              {a.acceptedAt && (<><dt className="text-slate-500">{t("staff_portal.accepted_at")}</dt><dd className="tabular-nums text-slate-800">{formatDate(a.acceptedAt)}</dd></>)}
              {a.completedAt && (<><dt className="text-slate-500">{t("staff_portal.completed_at")}</dt><dd className="tabular-nums text-slate-800">{formatDate(a.completedAt)}</dd></>)}
            </dl>
          </div>

          {/* Supplier chat */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-semibold tracking-tight text-slate-800">
              <ChatCircleDots size={18} className="text-slate-400" />
              {t("staff_portal.supplier_chat")}
            </h2>

            {(data?.chat ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">{t("staff_portal.no_chat")}</p>
            ) : (
              <ul className="space-y-2">
                {data!.chat.map((c) => {
                  const sent = c.direction === "Sent";
                  return (
                    <li key={c.id} className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", sent ? "ml-auto bg-primary-light text-slate-800" : "bg-slate-100 text-slate-800")}>
                      <p>{c.message}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                        {sent ? <ArrowRight size={11} /> : <ArrowLeft size={11} />}
                        NCC{c.platformChatTool ? ` · ${c.platformChatTool}` : ""} · {formatDate(c.sentAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            <form onSubmit={sendChat} className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              <div className="flex gap-2">
                <select value={direction} onChange={(e) => setDirection(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                  <option value="Sent">{t("staff_portal.chat_sent")}</option>
                  <option value="Received">{t("staff_portal.chat_received")}</option>
                </select>
                <input value={tool} onChange={(e) => setTool(e.target.value)} placeholder={t("staff_portal.chat_tool")} className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("staff_portal.chat_message")} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <div className="flex justify-end">
                <Button type="submit" size="sm" loading={sending}>
                  <PaperPlaneTilt size={16} weight="fill" /> {t("staff_portal.chat_add")}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </FadeIn>
  );
}
