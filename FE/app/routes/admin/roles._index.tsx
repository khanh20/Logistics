import { useRef, useState } from "react";
import { Link, useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { rolesApi } from "~/lib/api/auth";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { RoleResponse, CreateRoleRequest, UpdateRoleRequest } from "~/lib/types/auth";
import type { Route } from "./+types/roles._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Phân quyền — MuaHo Admin" }];
}

export async function clientLoader() {
  const res = await rolesApi.getAll();
  const roles: RoleResponse[] = res.data ?? [];
  return { roles };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

type ModalMode = "create" | "edit";

interface RoleForm {
  name: string;
  description: string;
  scope: string;
}

interface RoleModalProps {
  mode: ModalMode;
  form: RoleForm;
  submitting: boolean;
  error: string | null;
  onChange: (field: keyof RoleForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function RoleModal({
  mode, form, submitting, error, onChange, onSubmit, onClose,
}: RoleModalProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {mode === "create" ? t("roles.modal_create_title") : t("roles.modal_edit_title")}
        </h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("roles.field_name")} <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={t("roles.field_name_placeholder")}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("roles.field_scope")} <span className="text-red-500">*</span>
            </label>
            <select
              value={form.scope}
              onChange={(e) => onChange("scope", e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="" disabled>{t("roles.field_scope_placeholder")}</option>
              <option value="user">user</option>
              <option value="staff">staff</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("roles.field_description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder={t("roles.field_description_placeholder")}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t("common.loading")
                : mode === "create"
                ? t("common.create")
                : t("common.update")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_FORM: RoleForm = { name: "", description: "", scope: "" };

export default function RolesIndexPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();

  const [roles, setRoles] = useState<RoleResponse[]>(loaderData.roles);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Open create modal ─────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setModalMode("create");
    setEditingId(null);
    setModalError(null);
    setModalOpen(true);
  }

  // ── Open edit modal ───────────────────────────────────────────────────────
  function openEdit(role: RoleResponse) {
    setForm({
      name:        role.name,
      description: role.description ?? "",
      scope:       role.scope,
    });
    setModalMode("edit");
    setEditingId(role.id);
    setModalError(null);
    setModalOpen(true);
  }

  function handleFormChange(field: keyof RoleForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Submit create / edit ──────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (modalMode === "create") {
        const body: CreateRoleRequest = {
          name:        form.name.trim(),
          description: form.description.trim() || undefined,
          scope:       form.scope.trim(),
        };
        await rolesApi.create(body);
        showToast(t("roles.success_create", { name: body.name }));
      } else if (editingId) {
        const body: UpdateRoleRequest = {
          name:        form.name.trim(),
          description: form.description.trim() || undefined,
          scope:       form.scope.trim(),
        };
        await rolesApi.update(editingId, body);
        showToast(t("roles.success_update", { name: body.name }));
      }

      setModalOpen(false);
      revalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rolesApi.delete(deleteTarget.id);
      showToast(t("roles.success_delete", { name: deleteTarget.name }));
      setDeleteTarget(null);
      revalidate();
    } catch {
      // ignore — revalidate will restore list
    } finally {
      setDeleting(false);
    }
  }

  // Sync loaderData → local state on revalidation
  if (loaderData.roles !== roles && !modalOpen) {
    setRoles(loaderData.roles);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("roles.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("roles.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>{t("roles.btn_create")}</Button>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-3">
        {t("roles.total", { count: loaderData.roles.length })}
      </p>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("roles.col_name")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("roles.col_scope")}</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">{t("roles.col_permissions")}</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">{t("roles.col_flags")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("roles.col_created")}</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">{t("roles.col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loaderData.roles.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  {t("roles.no_roles")}
                </td>
              </tr>
            ) : (
              loaderData.roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-gray-900">{role.name}</td>

                  {/* Scope */}
                  <td className="px-4 py-3 text-gray-600">{role.scope}</td>

                  {/* Permission count */}
                  <td className="px-4 py-3 text-center text-gray-700">
                    {t("roles.perm_count", { count: role.permissions.length })}
                  </td>

                  {/* Badges */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {role.isSystem && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {t("roles.badge_system")}
                        </span>
                      )}
                      {role.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {t("roles.badge_default")}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(role.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/admin/roles/${role.id}`}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300
                                   text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {t("roles.btn_manage_perms")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(role)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300
                                   text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {t("roles.btn_edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(role)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-red-200
                                   text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {t("roles.btn_delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <RoleModal
          mode={modalMode}
          form={form}
          submitting={submitting}
          error={modalError}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {t("roles.btn_delete")}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {t("roles.delete_confirm", { name: deleteTarget.name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                variant="danger"
              >
                {deleting ? t("common.loading") : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm
                        px-4 py-3 rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
