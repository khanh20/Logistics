import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usersApi, rolesApi } from "~/lib/api/auth";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { useFetch } from "~/lib/hooks/useFetch";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Modal } from "~/components/ui/Modal";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import {
  MagnifyingGlass, UserPlus, UsersThree, PencilSimple,
  CheckCircle, Pause, Prohibit, Phone,
} from "~/components/shared/icons";
import { formatDate } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { RoleResponse, StaffUserDto, UserStatus } from "~/lib/types/auth";
import type { StaffWorkloadDto } from "~/lib/types/order";

export function meta() {
  return [{ title: "Quản lý nhân viên — MuaHo Admin" }];
}

interface StaffData {
  staff: StaffUserDto[];
  allRoles: RoleResponse[];
  workloadMap: Record<string, StaffWorkloadDto>;
}

async function loadStaff(): Promise<StaffData> {
  const [usersRes, rolesRes] = await Promise.all([usersApi.getAll(1, 200), rolesApi.getAll()]);
  const staff: StaffUserDto[] = usersRes.data?.data ?? [];
  const allRoles: RoleResponse[] = rolesRes.data ?? [];

  const workloadResults = await Promise.allSettled(staff.map((s) => staffAssignmentsApi.getWorkload(s.id)));
  const workloadMap: Record<string, StaffWorkloadDto> = {};
  workloadResults.forEach((r, i) => {
    if (r.status === "fulfilled") workloadMap[staff[i].id] = r.value.data as StaffWorkloadDto;
  });
  return { staff, allRoles, workloadMap };
}

// ── Modal ─────────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit";
interface StaffForm { email: string; password: string; fullName: string; phone: string; }
const EMPTY_FORM: StaffForm = { email: "", password: "", fullName: "", phone: "" };

interface StaffModalProps {
  mode: ModalMode;
  form: StaffForm;
  submitting: boolean;
  error: string | null;
  allRoles: RoleResponse[];
  selectedRoleIds: Set<string>;
  onChange: (field: keyof StaffForm, value: string) => void;
  onToggleRole: (roleId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function StaffModal({ mode, form, submitting, error, allRoles, selectedRoleIds, onChange, onToggleRole, onSubmit, onClose }: StaffModalProps) {
  const { t } = useTranslation();
  return (
    <Modal open onClose={onClose} maxWidth="lg" title={mode === "create" ? t("staff_mgmt.modal_add_title") : t("staff_mgmt.modal_edit_title")}>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("staff_mgmt.field_name")} <span className="text-red-500">*</span>
          </label>
          <input type="text" required value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)}
            placeholder={t("staff_mgmt.field_name_placeholder")}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>

        {mode === "create" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("staff_mgmt.field_email")} <span className="text-red-500">*</span>
              </label>
              <input type="email" required value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="user@muaho.vn"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("staff_mgmt.field_password")} <span className="text-red-500">*</span>
              </label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => onChange("password", e.target.value)} placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <p className="mt-1 text-xs text-slate-400">{t("staff_mgmt.password_hint")}</p>
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t("staff_mgmt.field_phone")} <span className="font-normal text-slate-400">({t("common.optional")})</span>
          </label>
          <input type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="0912 345 678"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t("staff_mgmt.field_roles")}</label>
          {allRoles.length === 0 ? (
            <p className="text-sm text-slate-400">{t("staff_mgmt.no_roles_available")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 p-3">
              {allRoles.map((role) => {
                const checked = selectedRoleIds.has(role.id);
                return (
                  <label key={role.id} className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    checked ? "bg-primary/10 font-medium text-primary" : "text-slate-700 hover:bg-slate-50")}>
                    <input type="checkbox" checked={checked} onChange={() => onToggleRole(role.id)} className="h-4 w-4 rounded border-slate-300 accent-primary" />
                    <span className="truncate" title={role.description ?? role.name}>{role.name}</span>
                  </label>
                );
              })}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">{t("staff_mgmt.roles_hint")}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={submitting}>{mode === "create" ? t("staff_mgmt.btn_add_confirm") : t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Row helpers ─────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials || "?"}
    </div>
  );
}

const STATUS_DOT: Record<UserStatus, string> = { Active: "bg-emerald-500", Suspended: "bg-amber-500", Banned: "bg-red-500" };
const STATUS_PILL: Record<UserStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Suspended: "bg-amber-50 text-amber-700",
  Banned: "bg-red-50 text-red-700",
};
function StatusPill({ status, label }: { status: UserStatus; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", STATUS_PILL[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
      {label}
    </span>
  );
}

// Thao tác dạng icon-button gọn + tooltip (taste-skill: icon, bớt nút text).
function RowActions({ member, busy, onEdit, onStatus }: {
  member: StaffUserDto; busy: boolean; onEdit: () => void; onStatus: (s: UserStatus) => void;
}) {
  const { t } = useTranslation();
  const btn = "rounded-lg p-1.5 transition active:scale-90 disabled:opacity-40";
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button title={t("staff_mgmt.btn_edit")} onClick={onEdit}
        className={cn(btn, "text-slate-400 hover:bg-slate-100 hover:text-slate-700")}>
        <PencilSimple size={16} />
      </button>
      {member.status !== "Active" && (
        <button title={t("staff_mgmt.btn_activate")} disabled={busy} onClick={() => onStatus("Active")}
          className={cn(btn, "text-emerald-500 hover:bg-emerald-50")}>
          <CheckCircle size={16} weight="bold" />
        </button>
      )}
      {member.status !== "Suspended" && (
        <button title={t("staff_mgmt.btn_suspend")} disabled={busy} onClick={() => onStatus("Suspended")}
          className={cn(btn, "text-amber-500 hover:bg-amber-50")}>
          <Pause size={16} weight="fill" />
        </button>
      )}
      {member.status !== "Banned" && (
        <button title={t("staff_mgmt.btn_ban")} disabled={busy} onClick={() => onStatus("Banned")}
          className={cn(btn, "text-red-500 hover:bg-red-50")}>
          <Prohibit size={16} weight="bold" />
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type StatusFilter = "all" | UserStatus;

export default function StaffIndexPage() {
  const { t } = useTranslation();
  const { data, loading, setData } = useFetch<StaffData>(loadStaff, []);
  const staff = data?.staff ?? [];
  const allRoles = data?.allRoles ?? [];
  const workloadMap = data?.workloadMap ?? {};

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editTarget, setEditTarget] = useState<StaffUserDto | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [initialRoleIds, setInitialRoleIds] = useState<Set<string>>(new Set());

  // Patch staff list trong data (giữ workloadMap/allRoles).
  function patchStaff(updater: (prev: StaffUserDto[]) => StaffUserDto[]) {
    setData((prev) => {
      const base = prev ?? { staff: [], allRoles, workloadMap };
      return { ...base, staff: updater(base.staff) };
    });
  }

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("staff_mgmt.filter_all") },
    { key: "Active", label: t("staff_mgmt.filter_active") },
    { key: "Banned", label: t("staff_mgmt.filter_banned") },
    { key: "Suspended", label: t("staff_mgmt.filter_suspended") },
  ];
  const STATUS_LABEL: Record<UserStatus, string> = {
    Active: t("staff_mgmt.status_active"), Banned: t("staff_mgmt.status_banned"), Suspended: t("staff_mgmt.status_suspended"),
  };

  const q = search.trim().toLowerCase();
  const visible = staff
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) => q === "" || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone ?? "").includes(q));

  async function handleStatusChange(member: StaffUserDto, newStatus: UserStatus) {
    const confirmKey = newStatus === "Active" ? "staff_mgmt.confirm_activate" : newStatus === "Banned" ? "staff_mgmt.confirm_ban" : "staff_mgmt.confirm_suspend";
    if (!window.confirm(t(confirmKey, { name: member.fullName }))) return;
    setLoadingId(member.id); setError(null); setSuccess(null);
    try {
      const res = await usersApi.updateStatus(member.id, newStatus);
      const updated = res.data as StaffUserDto;
      patchStaff((prev) => prev.map((s) => (s.id === member.id ? { ...s, status: updated.status } : s)));
      const successKey = newStatus === "Active" ? "staff_mgmt.success_activate" : newStatus === "Banned" ? "staff_mgmt.success_ban" : "staff_mgmt.success_suspend";
      setSuccess(t(successKey, { name: member.fullName }));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoadingId(null);
    }
  }

  function roleNamesToIds(names: string[]): Set<string> {
    const nameSet = new Set(names.map((n) => n.toLowerCase()));
    return new Set(allRoles.filter((r) => nameSet.has(r.name.toLowerCase())).map((r) => r.id));
  }
  function openCreate() {
    setForm(EMPTY_FORM); setSelectedRoleIds(new Set()); setInitialRoleIds(new Set()); setFormError(null); setModalMode("create");
  }
  function openEdit(member: StaffUserDto) {
    setEditTarget(member);
    setForm({ email: member.email, password: "", fullName: member.fullName, phone: member.phone ?? "" });
    const ids = roleNamesToIds(member.roles);
    setSelectedRoleIds(new Set(ids)); setInitialRoleIds(new Set(ids)); setFormError(null); setModalMode("edit");
  }
  function closeModal() { setModalMode(null); setEditTarget(null); }
  function handleFormChange(field: keyof StaffForm, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }
  function handleToggleRole(roleId: string) {
    setSelectedRoleIds((prev) => { const next = new Set(prev); next.has(roleId) ? next.delete(roleId) : next.add(roleId); return next; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setFormError(null); setError(null); setSuccess(null);
    try {
      if (modalMode === "create") {
        const res = await usersApi.createUser({
          email: form.email.trim(), password: form.password, fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined, roleIds: [...selectedRoleIds],
        });
        const created = res.data as StaffUserDto;
        patchStaff((prev) => [created, ...prev]);
        setSuccess(t("staff_mgmt.success_create", { name: created.fullName }));
        closeModal();
      } else if (modalMode === "edit" && editTarget) {
        const profileRes = await usersApi.updateStaff(editTarget.id, { fullName: form.fullName.trim(), phone: form.phone.trim() || null, avatarUrl: null });
        const updated = profileRes.data as StaffUserDto;
        const toAdd = [...selectedRoleIds].filter((id) => !initialRoleIds.has(id));
        const toRemove = [...initialRoleIds].filter((id) => !selectedRoleIds.has(id));
        await Promise.all([
          ...toAdd.map((roleId) => rolesApi.assignRole({ userId: editTarget.id, roleId })),
          ...toRemove.map((roleId) => rolesApi.removeRole({ userId: editTarget.id, roleId })),
        ]);
        const newRoleNames = allRoles.filter((r) => selectedRoleIds.has(r.id)).map((r) => r.name);
        patchStaff((prev) => prev.map((s) => s.id === editTarget.id
          ? { ...s, fullName: updated.fullName ?? form.fullName.trim(), phone: updated.phone ?? (form.phone.trim() || undefined), roles: newRoleNames }
          : s));
        setSuccess(t("staff_mgmt.success_update", { name: form.fullName.trim() }));
        closeModal();
      }
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FadeIn className="max-w-6xl space-y-6">
      <SectionHeader
        title={t("staff_mgmt.title")}
        subtitle={t("staff_mgmt.subtitle")}
        action={
          <Button onClick={openCreate} className="shrink-0">
            <UserPlus size={16} weight="bold" /> {t("staff_mgmt.btn_add")}
          </Button>
        }
      />

      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlass size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("staff_mgmt.search_placeholder")}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={cn("rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-[0.97]",
                  filter === key ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary")}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm text-slate-500">{t("staff_mgmt.total", { count: visible.length })}</span>
        </div>
      </div>

      {/* Table */}
      {loading && !data ? (
        <SkeletonPanel rows={6} cols={6} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<UsersThree size={40} />}
          title={q || filter !== "all" ? t("staff_mgmt.search_empty") : t("staff_mgmt.no_staff")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{t("staff_mgmt.col_staff")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{t("staff_mgmt.col_roles")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{t("staff_mgmt.col_status")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{t("staff_mgmt.col_workload")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{t("staff_mgmt.col_joined")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((member) => {
                const wl = workloadMap[member.id];
                const isLoading = loadingId === member.id;
                return (
                  <tr key={member.id} className="transition-colors hover:bg-slate-50">
                    {/* Nhân viên */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.fullName} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{member.fullName}</p>
                          <p className="truncate text-xs text-slate-500">{member.email}</p>
                          {member.phone && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                              <Phone size={11} /> {member.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Vai trò */}
                    <td className="px-4 py-3.5">
                      {member.roles.length === 0 ? (
                        <span className="text-xs text-slate-300">{t("staff_mgmt.no_roles")}</span>
                      ) : (
                        <div className="flex max-w-[14rem] flex-wrap gap-1">
                          {member.roles.map((r) => (
                            <span key={r} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{r}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* Trạng thái */}
                    <td className="px-4 py-3.5"><StatusPill status={member.status} label={STATUS_LABEL[member.status]} /></td>
                    {/* Tải việc */}
                    <td className="px-4 py-3.5">
                      {wl ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="tabular-nums text-slate-700">
                            {wl.activeCount > 0 ? t("staff_mgmt.active_orders", { count: wl.activeCount }) : <span className="text-slate-400">{t("staff_mgmt.no_orders")}</span>}
                          </span>
                          {wl.overdueCount > 0 && (
                            <Badge variant="error">{t("staff_mgmt.overdue_count", { count: wl.overdueCount })}</Badge>
                          )}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    {/* Ngày vào */}
                    <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-xs text-slate-500">{formatDate(member.createdAt)}</td>
                    {/* Thao tác */}
                    <td className="px-4 py-3.5">
                      <RowActions member={member} busy={isLoading} onEdit={() => openEdit(member)} onStatus={(s) => handleStatusChange(member, s)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalMode && (
        <StaffModal
          mode={modalMode}
          form={form}
          submitting={submitting}
          error={formError}
          allRoles={allRoles}
          selectedRoleIds={selectedRoleIds}
          onChange={handleFormChange}
          onToggleRole={handleToggleRole}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </FadeIn>
  );
}
