import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usersApi, rolesApi } from "~/lib/api/auth";
import { staffAssignmentsApi } from "~/lib/api/orders";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { RoleResponse, StaffUserDto, UserStatus } from "~/lib/types/auth";
import type { StaffWorkloadDto } from "~/lib/types/order";
import type { Route } from "./+types/staff._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý nhân viên — MuaHo Admin" }];
}

export async function clientLoader() {
  const [usersRes, rolesRes] = await Promise.all([
    usersApi.getAll(1, 200),
    rolesApi.getAll(),
  ]);

  const staff: StaffUserDto[] = usersRes.data?.data ?? [];
  const allRoles: RoleResponse[] = rolesRes.data ?? [];

  const workloadResults = await Promise.allSettled(
    staff.map((s) => staffAssignmentsApi.getWorkload(s.id))
  );

  const workloadMap: Record<string, StaffWorkloadDto> = {};
  workloadResults.forEach((result, i) => {
    if (result.status === "fulfilled") {
      workloadMap[staff[i].id] = result.value.data as StaffWorkloadDto;
    }
  });

  return { staff, allRoles, workloadMap };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<UserStatus, string> = {
  Active:    "bg-green-100 text-green-800",
  Banned:    "bg-red-100 text-red-800",
  Suspended: "bg-amber-100 text-amber-800",
};

function StatusBadge({ status, label }: { status: UserStatus; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      STATUS_STYLE[status]
    )}>
      {label}
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit";

interface StaffForm {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

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

function StaffModal({
  mode, form, submitting, error,
  allRoles, selectedRoleIds,
  onChange, onToggleRole, onSubmit, onClose,
}: StaffModalProps) {
  const { t } = useTranslation();
  const firstRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? t("staff_mgmt.modal_add_title") : t("staff_mgmt.modal_edit_title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Form — scrollable body */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* FullName */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("staff_mgmt.field_name")} <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstRef}
              type="text"
              required
              value={form.fullName}
              onChange={(e) => onChange("fullName", e.target.value)}
              placeholder={t("staff_mgmt.field_name_placeholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                         focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Email + Password — create only */}
          {mode === "create" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("staff_mgmt.field_email")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => onChange("email", e.target.value)}
                  placeholder="user@muaho.vn"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                             focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t("staff_mgmt.field_password")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                             focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-gray-400">{t("staff_mgmt.password_hint")}</p>
              </div>
            </>
          )}

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("staff_mgmt.field_phone")}{" "}
              <span className="font-normal text-gray-400">({t("common.optional")})</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="0912 345 678"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none
                         focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t("staff_mgmt.field_roles")}
            </label>
            {allRoles.length === 0 ? (
              <p className="text-sm text-gray-400">{t("staff_mgmt.no_roles_available")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-gray-200 p-3">
                {allRoles.map((role) => {
                  const checked = selectedRoleIds.has(role.id);
                  return (
                    <label
                      key={role.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
                        checked ? "bg-primary/10 text-primary font-medium" : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleRole(role.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="truncate" title={role.description ?? role.name}>
                        {role.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">{t("staff_mgmt.roles_hint")}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={submitting}>
              {mode === "create" ? t("staff_mgmt.btn_add_confirm") : t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type StatusFilter = "all" | UserStatus;
const EMPTY_FORM: StaffForm = { email: "", password: "", fullName: "", phone: "" };

export default function StaffIndexPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const { allRoles, workloadMap } = loaderData;

  const [staff, setStaff]         = useState<StaffUserDto[]>(loaderData.staff);
  const [filter, setFilter]       = useState<StatusFilter>("all");
  const [search, setSearch]       = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Modal
  const [modalMode, setModalMode]   = useState<ModalMode | null>(null);
  const [editTarget, setEditTarget] = useState<StaffUserDto | null>(null);
  const [form, setForm]             = useState<StaffForm>(EMPTY_FORM);
  const [formError, setFormError]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Role selection in modal
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [initialRoleIds, setInitialRoleIds]   = useState<Set<string>>(new Set());

  const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
    { key: "all",       label: t("staff_mgmt.filter_all") },
    { key: "Active",    label: t("staff_mgmt.filter_active") },
    { key: "Banned",    label: t("staff_mgmt.filter_banned") },
    { key: "Suspended", label: t("staff_mgmt.filter_suspended") },
  ];

  const STATUS_LABEL: Record<UserStatus, string> = {
    Active:    t("staff_mgmt.status_active"),
    Banned:    t("staff_mgmt.status_banned"),
    Suspended: t("staff_mgmt.status_suspended"),
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase();
  const visible = staff
    .filter((s) => filter === "all" || s.status === filter)
    .filter((s) =>
      q === "" ||
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone ?? "").includes(q)
    );

  // ── Status change ─────────────────────────────────────────────────────────
  async function handleStatusChange(member: StaffUserDto, newStatus: UserStatus) {
    const confirmKey =
      newStatus === "Active"    ? "staff_mgmt.confirm_activate" :
      newStatus === "Banned"    ? "staff_mgmt.confirm_ban"      :
                                  "staff_mgmt.confirm_suspend";
    if (!window.confirm(t(confirmKey, { name: member.fullName }))) return;

    setLoadingId(member.id);
    setError(null);
    setSuccess(null);
    try {
      const res     = await usersApi.updateStatus(member.id, newStatus);
      const updated = res.data as StaffUserDto;
      setStaff((prev) =>
        prev.map((s) => s.id === member.id ? { ...s, status: updated.status } : s)
      );
      const successKey =
        newStatus === "Active" ? "staff_mgmt.success_activate" :
        newStatus === "Banned" ? "staff_mgmt.success_ban"      :
                                 "staff_mgmt.success_suspend";
      setSuccess(t(successKey, { name: member.fullName }));
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoadingId(null);
    }
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  // Map role name → role id using allRoles list
  function roleNamesToIds(names: string[]): Set<string> {
    const nameSet = new Set(names.map((n) => n.toLowerCase()));
    const ids = allRoles
      .filter((r) => nameSet.has(r.name.toLowerCase()))
      .map((r) => r.id);
    return new Set(ids);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setSelectedRoleIds(new Set());
    setInitialRoleIds(new Set());
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(member: StaffUserDto) {
    setEditTarget(member);
    setForm({
      email:    member.email,
      password: "",
      fullName: member.fullName,
      phone:    member.phone ?? "",
    });
    const ids = roleNamesToIds(member.roles);
    setSelectedRoleIds(new Set(ids));
    setInitialRoleIds(new Set(ids));
    setFormError(null);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditTarget(null);
  }

  function handleFormChange(field: keyof StaffForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleToggleRole(roleId: string) {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setError(null);
    setSuccess(null);

    try {
      if (modalMode === "create") {
        const res = await usersApi.createUser({
          email:    form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          phone:    form.phone.trim() || undefined,
          roleIds:  [...selectedRoleIds],
        });
        const created = res.data as StaffUserDto;
        setStaff((prev) => [created, ...prev]);
        setSuccess(t("staff_mgmt.success_create", { name: created.fullName }));
        closeModal();

      } else if (modalMode === "edit" && editTarget) {
        // 1. Cập nhật profile
        const profileRes = await usersApi.updateStaff(editTarget.id, {
          fullName: form.fullName.trim(),
          phone:    form.phone.trim() || null,
          avatarUrl: null,
        });
        const updated = profileRes.data as StaffUserDto;

        // 2. Diff roles: thêm role mới, xóa role đã bỏ
        const toAdd    = [...selectedRoleIds].filter((id) => !initialRoleIds.has(id));
        const toRemove = [...initialRoleIds].filter((id) => !selectedRoleIds.has(id));

        await Promise.all([
          ...toAdd.map((roleId) =>
            rolesApi.assignRole({ userId: editTarget.id, roleId })
          ),
          ...toRemove.map((roleId) =>
            rolesApi.removeRole({ userId: editTarget.id, roleId })
          ),
        ]);

        // Cập nhật local state (build role names từ allRoles)
        const newRoleNames = allRoles
          .filter((r) => selectedRoleIds.has(r.id))
          .map((r) => r.name);

        setStaff((prev) =>
          prev.map((s) =>
            s.id === editTarget.id
              ? {
                  ...s,
                  fullName: updated.fullName ?? form.fullName.trim(),
                  phone:    updated.phone ?? (form.phone.trim() || undefined),
                  roles:    newRoleNames,
                }
              : s
          )
        );

        setSuccess(t("staff_mgmt.success_update", { name: form.fullName.trim() }));
        closeModal();
      }
    } catch (err: unknown) {
      setFormError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("staff_mgmt.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("staff_mgmt.subtitle")}</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          + {t("staff_mgmt.btn_add")}
        </Button>
      </div>

      {/* Alerts */}
      {error   && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("staff_mgmt.search_placeholder")}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm
                       outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {FILTER_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  filter === key
                    ? "bg-primary text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {t("staff_mgmt.total", { count: visible.length })}
          </span>
        </div>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">
            {q || filter !== "all" ? t("staff_mgmt.search_empty") : t("staff_mgmt.no_staff")}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  t("staff_mgmt.col_staff"),
                  t("staff_mgmt.col_roles"),
                  t("staff_mgmt.col_phone"),
                  t("staff_mgmt.col_status"),
                  t("staff_mgmt.col_workload"),
                  t("staff_mgmt.col_overdue"),
                  t("staff_mgmt.col_joined"),
                  t("staff_mgmt.col_actions"),
                ].map((h) => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.map((member) => {
                const wl        = workloadMap[member.id];
                const isLoading = loadingId === member.id;
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    {/* Name + Email */}
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{member.fullName}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-4">
                      {member.roles.length === 0 ? (
                        <span className="text-xs text-gray-300">{t("staff_mgmt.no_roles")}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((r) => (
                            <span key={r}
                              className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-4 text-gray-500">
                      {member.phone ?? <span className="text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={member.status} label={STATUS_LABEL[member.status]} />
                    </td>

                    {/* Workload */}
                    <td className="px-4 py-4 text-gray-600">
                      {wl
                        ? wl.activeCount > 0
                          ? t("staff_mgmt.active_orders", { count: wl.activeCount })
                          : t("staff_mgmt.no_orders")
                        : "—"}
                    </td>

                    {/* Overdue */}
                    <td className="px-4 py-4">
                      {wl
                        ? wl.overdueCount > 0
                          ? (
                            <span className="inline-flex items-center rounded-full bg-red-100
                                             px-2 py-0.5 text-xs font-medium text-red-700">
                              {t("staff_mgmt.overdue_count", { count: wl.overdueCount })}
                            </span>
                          )
                          : <span className="text-xs text-gray-400">0</span>
                        : "—"}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {formatDate(member.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(member)}>
                          {t("staff_mgmt.btn_edit")}
                        </Button>
                        {member.status !== "Active" && (
                          <Button size="sm" variant="secondary" loading={isLoading}
                            onClick={() => handleStatusChange(member, "Active")}>
                            {t("staff_mgmt.btn_activate")}
                          </Button>
                        )}
                        {member.status !== "Suspended" && (
                          <Button size="sm" variant="ghost" loading={isLoading}
                            onClick={() => handleStatusChange(member, "Suspended")}>
                            {t("staff_mgmt.btn_suspend")}
                          </Button>
                        )}
                        {member.status !== "Banned" && (
                          <Button size="sm" variant="danger" loading={isLoading}
                            onClick={() => handleStatusChange(member, "Banned")}>
                            {t("staff_mgmt.btn_ban")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
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
    </div>
  );
}
