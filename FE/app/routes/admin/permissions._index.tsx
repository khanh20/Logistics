import { useMemo, useRef, useState } from "react";
import { useRevalidator } from "react-router";
import { useTranslation } from "react-i18next";
import { permissionsApi } from "~/lib/api/auth";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/utils/cn";
import type {
  CreatePermissionRequest,
  PermissionResponse,
  UpdatePermissionRequest,
} from "~/lib/types/auth";
import type { Route } from "./+types/permissions._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quyền hạn — MuaHo Admin" }];
}

export async function clientLoader() {
  const res = await permissionsApi.getAll();
  const permissions: PermissionResponse[] = res.data ?? [];
  return { permissions };
}

// ── Modal ─────────────────────────────────────────────────────────────────────
type ModalMode = "create" | "edit";

interface PermForm {
  name:        string;
  code:        string;
  moduleName:  string;
  description: string;
}

interface PermModalProps {
  mode:       ModalMode;
  form:       PermForm;
  submitting: boolean;
  error:      string | null;
  onChange:   (field: keyof PermForm, value: string) => void;
  onSubmit:   (e: React.FormEvent) => void;
  onClose:    () => void;
}

function PermModal({ mode, form, submitting, error, onChange, onSubmit, onClose }: PermModalProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === "create" ? t("permissions.modal_create_title") : t("permissions.modal_edit_title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("permissions.field_name")} <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={t("permissions.field_name_placeholder")}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Code — disabled in edit mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("permissions.field_code")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => onChange("code", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
              placeholder={t("permissions.field_code_placeholder")}
              required
              disabled={mode === "edit"}
              className={cn(
                "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
                mode === "edit" && "bg-gray-50 text-gray-500 cursor-not-allowed"
              )}
            />
            <p className="mt-1 text-xs text-gray-400">{t("permissions.field_code_hint")}</p>
          </div>

          {/* Module */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("permissions.field_module")} <span className="text-red-500">*</span>
            </label>
            <select
              value={form.moduleName}
              onChange={(e) => onChange("moduleName", e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="" disabled>{t("permissions.field_module_placeholder")}</option>
              <option value="auth">auth</option>
              <option value="mod1">mod1</option>
              <option value="mod2">mod2</option>
              <option value="mod3">mod3</option>
              <option value="shared">shared</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("permissions.field_description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder={t("permissions.field_description_placeholder")}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? t("common.loading")
                : mode === "create" ? t("common.create") : t("common.update")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const EMPTY_FORM: PermForm = { name: "", code: "", moduleName: "", description: "" };

export default function PermissionsIndexPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();

  const [permissions, setPermissions] = useState<PermissionResponse[]>(loaderData.permissions);

  // Filters
  const [search,       setSearch]       = useState("");
  const [moduleFilter, setModuleFilter] = useState("");

  // Modal
  const [modalOpen,   setModalOpen]   = useState(false);
  const [modalMode,   setModalMode]   = useState<ModalMode>("create");
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [form,        setForm]        = useState<PermForm>(EMPTY_FORM);
  const [submitting,  setSubmitting]  = useState(false);
  const [modalError,  setModalError]  = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PermissionResponse | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Distinct module list for filter
  const modules = useMemo(
    () => [...new Set(loaderData.permissions.map((p) => p.moduleName))].sort(),
    [loaderData.permissions]
  );

  // Filtered list
  const q = search.trim().toLowerCase();
  const visible = permissions.filter((p) => {
    const matchSearch =
      q === "" ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q);
    const matchModule = moduleFilter === "" || p.moduleName === moduleFilter;
    return matchSearch && matchModule;
  });

  // ── Sync loaderData on revalidation ──────────────────────────────────────
  if (loaderData.permissions !== permissions && !modalOpen) {
    setPermissions(loaderData.permissions);
  }

  // ── Open create ───────────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setModalMode("create");
    setEditingId(null);
    setModalError(null);
    setModalOpen(true);
  }

  // ── Open edit ─────────────────────────────────────────────────────────────
  function openEdit(perm: PermissionResponse) {
    setForm({
      name:        perm.name,
      code:        perm.code,
      moduleName:  perm.moduleName,
      description: perm.description ?? "",
    });
    setModalMode("edit");
    setEditingId(perm.id);
    setModalError(null);
    setModalOpen(true);
  }

  function handleFormChange(field: keyof PermForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      if (modalMode === "create") {
        const body: CreatePermissionRequest = {
          name:        form.name.trim(),
          code:        form.code.trim(),
          moduleName:  form.moduleName.trim(),
          description: form.description.trim() || undefined,
        };
        await permissionsApi.create(body);
        showToast(t("permissions.success_create", { name: body.name }));
      } else if (editingId) {
        const body: UpdatePermissionRequest = {
          name:        form.name.trim(),
          moduleName:  form.moduleName.trim(),
          description: form.description.trim() || undefined,
        };
        await permissionsApi.update(editingId, body);
        showToast(t("permissions.success_update", { name: body.name }));
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
      await permissionsApi.delete(deleteTarget.id);
      showToast(t("permissions.success_delete", { name: deleteTarget.name }));
      setDeleteTarget(null);
      revalidate();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("permissions.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("permissions.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>{t("permissions.btn_create")}</Button>
      </div>

      {/* Search + Module filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("permissions.search_placeholder")}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm
                       outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm
                     outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("permissions.all_modules")}</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 self-center">
          {t("permissions.total", { count: visible.length })}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("permissions.col_name")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("permissions.col_code")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">{t("permissions.col_module")}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">
                {t("permissions.col_description")}
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">{t("permissions.col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">
                  {t("permissions.no_permissions")}
                </td>
              </tr>
            ) : (
              visible.map((perm) => (
                <tr key={perm.id} className="hover:bg-gray-50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-gray-900">{perm.name}</td>

                  {/* Code */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {perm.code}
                    </span>
                  </td>

                  {/* Module */}
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {perm.moduleName}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell max-w-[280px] truncate">
                    {perm.description ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(perm)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-gray-300
                                   text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {t("permissions.btn_edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(perm)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-red-200
                                   text-red-600 hover:bg-red-50 transition-colors"
                      >
                        {t("permissions.btn_delete")}
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
        <PermModal
          mode={modalMode}
          form={form}
          submitting={submitting}
          error={modalError}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {t("permissions.btn_delete")}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {t("permissions.delete_confirm", {
                name: deleteTarget.name,
                code: deleteTarget.code,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? t("common.loading") : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm
                        px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
