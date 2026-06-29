import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/categories._index";
import { categoriesApi, forbiddenCategoriesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Badge } from "~/components/ui/Badge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Plus, PencilSimple, Trash, Tag, Prohibit, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { cn } from "~/lib/utils/cn";
import type {
  CategoryTree,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ForbiddenCategory,
  CreateForbiddenCategoryRequest,
} from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý danh mục — MuaHo Admin" }];
}

type ActiveTab = "categories" | "forbidden";

export default function CategoriesPage() {
  const { t } = useTranslation();

  const { data, loading, error } = useFetch<{ categories: CategoryTree[]; forbidden: ForbiddenCategory[] }>(
    async () => {
      const [categoriesRes, forbiddenRes] = await Promise.all([
        categoriesApi.getTree(),
        forbiddenCategoriesApi.getAll(),
      ]);
      return { categories: categoriesRes.data, forbidden: forbiddenRes.data };
    },
    []
  );

  return (
    <FadeIn className="max-w-6xl space-y-6">
      <SectionHeader title={t("category.manage")} />
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}
      {loading && !data ? (
        <SkeletonPanel rows={8} cols={4} />
      ) : !data ? null : (
        <CategoriesInner initialCategories={data.categories} initialForbidden={data.forbidden} />
      )}
    </FadeIn>
  );
}

function CategoriesInner({
  initialCategories,
  initialForbidden,
}: {
  initialCategories: CategoryTree[];
  initialForbidden: ForbiddenCategory[];
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("categories");
  const [categories, setCategories] = useState<CategoryTree[]>(initialCategories);
  const [forbidden, setForbidden] = useState<ForbiddenCategory[]>(initialForbidden);

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "categories", label: t("category.tab_categories") },
    { key: "forbidden", label: t("category.tab_forbidden") },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "categories" && <CategoriesTab categories={categories} onUpdate={setCategories} />}
      {activeTab === "forbidden" && <ForbiddenTab forbidden={forbidden} onUpdate={setForbidden} />}
    </div>
  );
}

// ── Categories tab ────────────────────────────────────────────────────────────

type CategoryFormState = {
  nameVn: string;
  nameCn: string;
  slug: string;
  parentId: string;
  iconUrl: string;
  sortOrder: string;
  isActive: boolean;
};

function emptyCategoryForm(parentId = ""): CategoryFormState {
  return { nameVn: "", nameCn: "", slug: "", parentId, iconUrl: "", sortOrder: "0", isActive: true };
}

function categoryToForm(c: CategoryTree, parentId = ""): CategoryFormState {
  return {
    nameVn: c.nameVn,
    nameCn: c.nameCn ?? "",
    slug: c.slug,
    parentId,
    iconUrl: c.iconUrl ?? "",
    sortOrder: c.sortOrder.toString(),
    isActive: true,
  };
}

function CategoriesTab({
  categories,
  onUpdate,
}: {
  categories: CategoryTree[];
  onUpdate: (c: CategoryTree[]) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CategoryFormState>(emptyCategoryForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatAll = flattenTree(categories);

  function openAdd() {
    setForm(emptyCategoryForm());
    setEditingId("new");
    setError(null);
  }

  function openEdit(node: CategoryTree & { parentId?: string }) {
    setForm(categoryToForm(node, node.parentId ?? ""));
    setEditingId(node.id);
    setError(null);
  }

  function closeForm() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.nameVn.trim() || !form.slug.trim()) {
      setError(t("common.error"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        const req: CreateCategoryRequest = {
          nameVn: form.nameVn.trim(),
          nameCn: form.nameCn.trim() || undefined,
          slug: form.slug.trim(),
          parentId: form.parentId || undefined,
          iconUrl: form.iconUrl.trim() || undefined,
          sortOrder: parseInt(form.sortOrder) || 0,
        };
        await categoriesApi.create(req);
      } else {
        const req: UpdateCategoryRequest = {
          nameVn: form.nameVn.trim(),
          nameCn: form.nameCn.trim() || undefined,
          slug: form.slug.trim(),
          sortOrder: parseInt(form.sortOrder) || 0,
          isActive: form.isActive,
        };
        await categoriesApi.update(editingId!, req);
      }
      const res = await categoriesApi.getTree();
      onUpdate(res.data);
      closeForm();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t("category.delete_confirm", { name }))) return;
    try {
      await categoriesApi.delete(id);
      const res = await categoriesApi.getTree();
      onUpdate(res.data);
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? t("common.error"));
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus size={15} weight="bold" />
          {t("category.create")}
        </Button>
      </div>

      {/* Form panel */}
      {editingId !== null && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 font-heading font-semibold text-slate-800">
            {editingId === "new" ? t("category.create") : t("category.edit")}
          </h3>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Input label={t("category.name_vn")} value={form.nameVn} onChange={(e) => setForm((f) => ({ ...f, nameVn: e.target.value }))} required />
            <Input label={t("category.name_cn")} value={form.nameCn} onChange={(e) => setForm((f) => ({ ...f, nameCn: e.target.value }))} />
            <Input label={t("category.slug")} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
            <Input label={t("category.sort_order")} type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            <Input label={t("category.icon_url")} value={form.iconUrl} onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))} />
            {editingId === "new" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">{t("category.parent")}</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t("category.no_parent")}</option>
                  {flatAll.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prefix}
                      {c.nameVn}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {editingId !== "new" && (
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                {t("category.is_active")}
              </label>
            )}
          </div>

          {error && (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <WarningCircle size={18} weight="fill" />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={closeForm}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}

      {/* Category tree list */}
      {flatAll.length === 0 ? (
        <EmptyState icon={<Tag size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("category.slug")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("category.sort_order")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flatAll.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <span className="text-slate-300">{c.prefix}</span>
                    {c.nameVn}
                    {c.nameCn && <span className="ml-2 text-xs text-slate-400">({c.nameCn})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{c.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-blue-100 hover:text-blue-600 active:scale-95"
                        title={t("category.edit")}
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.nameVn)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                        title={t("common.delete")}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Forbidden categories tab ──────────────────────────────────────────────────

type ForbiddenFormState = {
  name: string;
  reason: string;
  keywordsCn: string;
  keywordsVn: string;
  severity: string;
};

function emptyForbiddenForm(): ForbiddenFormState {
  return { name: "", reason: "", keywordsCn: "", keywordsVn: "", severity: "Block" };
}

function forbiddenToForm(f: ForbiddenCategory): ForbiddenFormState {
  return {
    name: f.name,
    reason: f.reason,
    keywordsCn: f.keywordsCn ?? "",
    keywordsVn: f.keywordsVn ?? "",
    severity: f.severity,
  };
}

function ForbiddenTab({
  forbidden,
  onUpdate,
}: {
  forbidden: ForbiddenCategory[];
  onUpdate: (f: ForbiddenCategory[]) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<ForbiddenFormState>(emptyForbiddenForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(emptyForbiddenForm());
    setEditingId("new");
    setError(null);
  }

  function openEdit(f: ForbiddenCategory) {
    setForm(forbiddenToForm(f));
    setEditingId(f.id);
    setError(null);
  }

  function closeForm() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.reason.trim()) {
      setError(t("common.error"));
      return;
    }
    setSaving(true);
    setError(null);
    const req: CreateForbiddenCategoryRequest = {
      name: form.name.trim(),
      reason: form.reason.trim(),
      keywordsCn: form.keywordsCn.trim() || undefined,
      keywordsVn: form.keywordsVn.trim() || undefined,
      severity: form.severity,
    };
    try {
      if (editingId === "new") {
        const res = await forbiddenCategoriesApi.create(req);
        onUpdate([...forbidden, res.data]);
      } else {
        const res = await forbiddenCategoriesApi.update(editingId!, req);
        onUpdate(forbidden.map((f) => (f.id === editingId ? res.data : f)));
      }
      closeForm();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus size={15} weight="bold" />
          {t("forbidden.create")}
        </Button>
      </div>

      {/* Form panel */}
      {editingId !== null && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="mb-4 font-heading font-semibold text-slate-800">
            {editingId === "new" ? t("forbidden.create") : t("forbidden.edit")}
          </h3>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Input label={t("forbidden.name")} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">{t("forbidden.severity")}</label>
              <select
                value={form.severity}
                onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Block">{t("forbidden.severity_block")}</option>
                <option value="Warn">{t("forbidden.severity_warn")}</option>
              </select>
            </div>
            <Input label={t("forbidden.reason")} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required className="col-span-2" />
            <Input label={t("forbidden.keywords_cn")} value={form.keywordsCn} onChange={(e) => setForm((f) => ({ ...f, keywordsCn: e.target.value }))} placeholder="keyword1, keyword2..." />
            <Input label={t("forbidden.keywords_vn")} value={form.keywordsVn} onChange={(e) => setForm((f) => ({ ...f, keywordsVn: e.target.value }))} placeholder="từ khóa 1, từ khóa 2..." />
          </div>

          {error && (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-700">
              <WarningCircle size={18} weight="fill" />
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={closeForm}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      )}

      {/* Forbidden list */}
      {forbidden.length === 0 ? (
        <EmptyState icon={<Prohibit size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("forbidden.name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("forbidden.reason")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("forbidden.keywords_vn")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("forbidden.severity")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forbidden.map((f) => (
                <tr key={f.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{f.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={f.reason}>
                    {f.reason}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-500">{f.keywordsVn ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={f.severity === "Block" ? "error" : "warning"}>{f.severity}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {f.isActive ? (
                      <Badge variant="success">{t("forbidden.is_active")}</Badge>
                    ) : (
                      <Badge variant="default">{t("common.inactive")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => openEdit(f)}
                      className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-blue-100 hover:text-blue-600 active:scale-95"
                      title={t("forbidden.edit")}
                    >
                      <PencilSimple size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function flattenTree(
  nodes: CategoryTree[],
  depth = 0
): Array<CategoryTree & { prefix: string; parentId?: string }> {
  return nodes.flatMap((c) => [
    { ...c, prefix: "　".repeat(depth) },
    ...flattenTree(c.children ?? [], depth + 1).map((child) => ({
      ...child,
      parentId: child.parentId ?? c.id,
    })),
  ]);
}
