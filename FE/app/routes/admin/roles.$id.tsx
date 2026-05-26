import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { rolesApi, permissionsApi } from "~/lib/api/auth";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/utils/cn";
import type { RoleResponse, PermissionResponse } from "~/lib/types/auth";
import type { Route } from "./+types/roles.$id";

export function meta({ data }: Route.MetaArgs) {
  const name = (data as { role: RoleResponse } | null)?.role?.name ?? "Role";
  return [{ title: `${name} — Phân quyền — MuaHo Admin` }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const id = params.id as string;
  const [roleRes, allPermsRes] = await Promise.all([
    rolesApi.getById(id),
    permissionsApi.getAll(),
  ]);
  const role: RoleResponse          = roleRes.data!;
  const allPermissions: PermissionResponse[] = allPermsRes.data ?? [];
  return { role, allPermissions };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Group permissions by moduleName
function groupByModule(
  perms: PermissionResponse[]
): [string, PermissionResponse[]][] {
  const map = new Map<string, PermissionResponse[]>();
  for (const p of perms) {
    const bucket = map.get(p.moduleName) ?? [];
    bucket.push(p);
    map.set(p.moduleName, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RolePermissionsPage({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation();
  const { role, allPermissions } = loaderData;

  // Checked codes (initialised from role's current permissions)
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(role.permissions)
  );

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const grouped = useMemo(() => groupByModule(allPermissions), [allPermissions]);
  const isReadOnly = false;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Toggle individual permission ──────────────────────────────────────────
  function toggle(code: string) {
    if (isReadOnly) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  // ── Check / uncheck all in a module ──────────────────────────────────────
  function toggleModule(perms: PermissionResponse[], selectAll: boolean) {
    if (isReadOnly) return;
    setChecked((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (selectAll) {
          next.add(p.code);
        } else {
          next.delete(p.code);
        }
      }
      return next;
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await permissionsApi.syncRolePermissions(role.id, [...checked]);
      showToast(t("roles.perm_success"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          to="/admin/roles"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {t("roles.back_to_roles")}
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("roles.perm_title", { name: role.name })}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("roles.perm_subtitle")}</p>
          </div>

          {!isReadOnly && (
            <Button onClick={handleSave} disabled={saving} className="shrink-0">
              {saving ? t("roles.perm_saving") : t("roles.perm_save")}
            </Button>
          )}
        </div>

        {/* System role indicator — informational only, không block chỉnh sửa */}
        {role.isSystem && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-purple-50 border
                          border-purple-200 rounded-lg text-sm text-purple-800">
            <span>🔒</span>
            {t("roles.badge_system")} — {t("roles.perm_system_info")}
          </div>
        )}

        {/* Save error */}
        {saveError && (
          <div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg
                          text-sm text-red-700">
            {saveError}
          </div>
        )}
      </div>

      {/* Role info chips */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-gray-500">
          {t("roles.field_scope")}: <strong className="text-gray-700">{role.scope}</strong>
        </span>
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
        <span className="text-xs text-gray-400 ml-auto">
          {t("roles.perm_count", { count: checked.size })}
        </span>
      </div>

      {/* Permission groups */}
      {allPermissions.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t("roles.perm_none")}</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([module, perms]) => {
            const allChecked = perms.every((p) => checked.has(p.code));
            const noneChecked = perms.every((p) => !checked.has(p.code));

            return (
              <div
                key={module}
                className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Module header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {t("roles.perm_module", { module })}
                  </h3>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleModule(perms, true)}
                        disabled={allChecked}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded border transition-colors",
                          allChecked
                            ? "border-gray-200 text-gray-300 cursor-not-allowed"
                            : "border-primary text-primary hover:bg-primary/10"
                        )}
                      >
                        {t("roles.check_all")}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleModule(perms, false)}
                        disabled={noneChecked}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded border transition-colors",
                          noneChecked
                            ? "border-gray-200 text-gray-300 cursor-not-allowed"
                            : "border-gray-400 text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        {t("roles.uncheck_all")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Permission checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                  {perms.map((perm) => {
                    const isChecked = checked.has(perm.code);
                    return (
                      <label
                        key={perm.id}
                        className={cn(
                          "flex items-start gap-2.5 px-4 py-3 bg-white text-sm",
                          !isReadOnly && "cursor-pointer hover:bg-primary/5 transition-colors",
                          isReadOnly && "cursor-default"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(perm.code)}
                          disabled={isReadOnly}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary
                                     focus:ring-primary cursor-pointer disabled:cursor-default"
                        />
                        <div className="min-w-0">
                          <p className={cn(
                            "font-medium leading-tight",
                            isChecked ? "text-gray-900" : "text-gray-500"
                          )}>
                            {perm.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {perm.code}
                          </p>
                          {perm.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky save bar (visible only when not read-only) */}
      {!isReadOnly && (
        <div className="sticky bottom-0 mt-6 py-4 bg-white/90 backdrop-blur border-t border-gray-200
                        flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {t("roles.perm_count", { count: checked.size })}
          </p>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("roles.perm_saving") : t("roles.perm_save")}
          </Button>
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
