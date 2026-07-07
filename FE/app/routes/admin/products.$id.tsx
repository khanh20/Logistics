import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/products.$id";
import { productsApi, variantsApi, imagesApi } from "~/lib/api/products";
import { categoriesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Input } from "~/components/ui/Input";
import { EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import {
  ArrowLeft, Star, PencilSimple, Trash, X, Plus, Package, WarningCircle, Image as ImageIcon,
} from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { cn } from "~/lib/utils/cn";
import { formatDate, formatCNY } from "~/lib/utils/format";
import type {
  ProductDetail,
  ProductVariant,
  ProductImage,
  AddVariantRequest,
  UpdateVariantRequest,
  PriceTierRequest,
  AddImageRequest,
} from "~/lib/types/product";
import type { CategoryTree } from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết sản phẩm — MuaHo Admin" }];
}

// ── Fetch wrapper: render NGAY + skeleton (non-blocking, không dùng clientLoader) ──
export default function ProductDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();

  const { data, loading, error } = useFetch<{ product: ProductDetail; categories: CategoryTree[] }>(
    async () => {
      const [productRes, categoriesRes] = await Promise.all([
        productsApi.getDetailForAdmin(id!), // admin endpoint — no view-count increment
        categoriesApi.getTree(),
      ]);
      return { product: productRes.data, categories: categoriesRes.data };
    },
    [id]
  );

  return (
    <FadeIn className="max-w-5xl space-y-6">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} weight="bold" />
        {t("common.back")}
      </Link>

      {loading && !data ? (
        <SkeletonPanel rows={8} cols={3} />
      ) : error || !data ? (
        <EmptyState icon={<WarningCircle size={40} />} title={error ?? t("common.error")} />
      ) : (
        <ProductDetailInner key={data.product.id} product={data.product} categories={data.categories} />
      )}
    </FadeIn>
  );
}

function ProductDetailInner({
  product: initialProduct,
  categories,
}: {
  product: ProductDetail;
  categories: CategoryTree[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(initialProduct);
  const [variants, setVariants] = useState<ProductVariant[]>(initialProduct.variants);
  const [images, setImages] = useState<ProductImage[]>(initialProduct.images);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [actionLoading, setActionLoading] = useState(false);

  async function handleToggleFeatured() {
    setActionLoading(true);
    try {
      const res = await productsApi.setFeatured(product.id, !product.isFeatured);
      setProduct(res.data);
    } catch {
      /* noop */
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeactivate() {
    const title = product.translatedTitle ?? product.originalTitle;
    if (!confirm(t("product.deactivate_confirm", { title }))) return;
    setActionLoading(true);
    try {
      await productsApi.deactivate(product.id);
      navigate("/admin/products");
    } catch {
      setActionLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "info", label: t("product.tab_info") },
    { key: "variants", label: `${t("product.tab_variants")} (${variants.length})` },
    { key: "images", label: `${t("product.tab_images")} (${images.length})` },
    { key: "attributes", label: `${t("product.tab_attributes")} (${product.attributes.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold leading-snug tracking-tight text-slate-900">
            {product.translatedTitle ?? product.originalTitle}
          </h1>
          {product.translatedTitle && (
            <p className="mt-0.5 text-sm text-slate-500">{product.originalTitle}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.isFeatured && <Badge variant="info">{t("product.featured_badge")}</Badge>}
            {product.isForbidden && <Badge variant="error">{t("product.forbidden_badge")}</Badge>}
            {product.isActive ? (
              <Badge variant="success">{t("product.active_badge")}</Badge>
            ) : (
              <Badge variant="default">{t("product.inactive_badge")}</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant={product.isFeatured ? "secondary" : "primary"}
            size="sm"
            loading={actionLoading}
            onClick={handleToggleFeatured}
            className="gap-1.5"
          >
            <Star size={15} weight={product.isFeatured ? "fill" : "regular"} />
            {product.isFeatured ? t("product.toggle_featured_off") : t("product.toggle_featured_on")}
          </Button>
          {product.isActive && (
            <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeactivate}>
              {t("product.deactivate")}
            </Button>
          )}
        </div>
      </div>

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

      {activeTab === "info" && (
        <InfoTab product={product} categories={categories} onUpdate={setProduct} />
      )}
      {activeTab === "variants" && (
        <VariantsTab productId={product.id} variants={variants} onUpdate={setVariants} />
      )}
      {activeTab === "images" && (
        <ImagesTab productId={product.id} images={images} onUpdate={setImages} />
      )}
      {activeTab === "attributes" && <AttributesTab attributes={product.attributes} />}
    </div>
  );
}

type Tab = "info" | "variants" | "images" | "attributes";

// ── Info tab ──────────────────────────────────────────────────────────────────

function InfoTab({
  product,
  categories,
  onUpdate,
}: {
  product: ProductDetail;
  categories: CategoryTree[];
  onUpdate: (p: ProductDetail) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState(product.translatedTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(product.seoDescription ?? "");
  const [categoryId, setCategoryId] = useState(product.category.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatCategories = flattenTree(categories);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await productsApi.updateInfo(product.id, {
        translatedTitle: translatedTitle || undefined,
        seoDescription: seoDesc || undefined,
        categoryId,
      });
      onUpdate(res.data);
      setEditing(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Slug",
      value: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{product.slug}</code>,
    },
    { label: t("product.original_title"), value: product.originalTitle },
    {
      label: t("product.translated_title"),
      value: editing ? (
        <Input
          value={translatedTitle}
          onChange={(e) => setTranslatedTitle(e.target.value)}
          className="max-w-sm"
        />
      ) : (
        product.translatedTitle ?? "—"
      ),
    },
    {
      label: t("product.seo_desc"),
      value: editing ? (
        <textarea
          value={seoDesc}
          onChange={(e) => setSeoDesc(e.target.value)}
          rows={3}
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        product.seoDescription ?? "—"
      ),
    },
    {
      label: t("product.original_url"),
      value: (
        <a
          href={product.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-sm truncate text-primary hover:underline"
        >
          {product.originalUrl}
        </a>
      ),
    },
    {
      label: t("product.filter_category"),
      value: editing ? (
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.prefix}
              {c.nameVn}
            </option>
          ))}
        </select>
      ) : (
        `${product.category.nameVn} (${product.category.slug})`
      ),
    },
    {
      label: "Shop",
      value: (
        <span className="inline-flex items-center gap-1">
          {product.shop.shopName} · {product.shop.platformName} ·
          <Star size={13} weight="fill" className="text-amber-500" />
          {product.shop.internalRating.toFixed(1)}
        </span>
      ),
    },
    { label: t("product.view_count"), value: product.viewCount.toLocaleString() },
    {
      label: t("product.last_synced"),
      value: product.lastPriceSyncedAt ? formatDate(product.lastPriceSyncedAt) : "—",
    },
    { label: t("common.created_at"), value: formatDate(product.createdAt) },
    ...(product.isForbidden
      ? [{ label: t("product.forbidden_reason"), value: product.forbiddenReason ?? "—" }]
      : []),
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {t("product.save_info")}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
            <PencilSimple size={15} />
            {t("product.edit_info")}
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100">
          {rows.map(({ label, value }) => (
            <div key={label} className="grid grid-cols-3 gap-4 px-6 py-3">
              <dt className="col-span-1 text-sm font-medium text-slate-500">{label}</dt>
              <dd className="col-span-2 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ── Variants tab ──────────────────────────────────────────────────────────────

type VariantFormState = {
  variantName: string;
  translatedName: string;
  priceCny: string;
  stockRaw: string;
  isAvailable: boolean;
  imageUrl: string;
  sortOrder: string;
  tiers: PriceTierRequest[];
};

function emptyVariantForm(): VariantFormState {
  return {
    variantName: "",
    translatedName: "",
    priceCny: "",
    stockRaw: "",
    isAvailable: true,
    imageUrl: "",
    sortOrder: "0",
    tiers: [],
  };
}

function variantToForm(v: ProductVariant): VariantFormState {
  return {
    variantName: v.variantName,
    translatedName: v.translatedName ?? "",
    priceCny: v.priceCnyCurrent.toString(),
    stockRaw: v.stockRaw?.toString() ?? "",
    isAvailable: v.isAvailable,
    imageUrl: v.imageUrl ?? "",
    sortOrder: "0",
    tiers: v.priceTiers.map((t) => ({
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity ?? undefined,
      priceCny: t.priceCny,
    })),
  };
}

function VariantsTab({
  productId,
  variants,
  onUpdate,
}: {
  productId: string;
  variants: ProductVariant[];
  onUpdate: (v: ProductVariant[]) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<VariantFormState>(emptyVariantForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(emptyVariantForm());
    setEditingId("new");
    setError(null);
  }

  function openEdit(v: ProductVariant) {
    setForm(variantToForm(v));
    setEditingId(v.id);
    setError(null);
  }

  function closeForm() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    const price = parseFloat(form.priceCny);
    if (!form.variantName.trim() || isNaN(price) || price <= 0) {
      setError(t("common.error"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        const req: AddVariantRequest = {
          variantName: form.variantName.trim(),
          translatedName: form.translatedName.trim() || undefined,
          priceCny: price,
          stockRaw: form.stockRaw ? parseInt(form.stockRaw) : undefined,
          imageUrl: form.imageUrl.trim() || undefined,
          sortOrder: parseInt(form.sortOrder) || 0,
        };
        const res = await variantsApi.add(productId, req);
        const newVariant = res.data;
        if (form.tiers.length > 0) {
          const tiersRes = await variantsApi.syncPriceTiers(productId, newVariant.id, {
            tiers: form.tiers,
          });
          onUpdate([...variants, tiersRes.data]);
        } else {
          onUpdate([...variants, newVariant]);
        }
      } else {
        const req: UpdateVariantRequest = {
          variantName: form.variantName.trim(),
          translatedName: form.translatedName.trim() || undefined,
          priceCny: price,
          stockRaw: form.stockRaw ? parseInt(form.stockRaw) : undefined,
          isAvailable: form.isAvailable,
          imageUrl: form.imageUrl.trim() || undefined,
          sortOrder: parseInt(form.sortOrder) || 0,
        };
        await variantsApi.update(productId, editingId!, req);
        const tiersRes = await variantsApi.syncPriceTiers(productId, editingId!, {
          tiers: form.tiers,
        });
        onUpdate(variants.map((v) => (v.id === editingId ? tiersRes.data : v)));
      }
      closeForm();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v: ProductVariant) {
    if (!confirm(t("product.delete_variant_confirm", { name: v.translatedName ?? v.variantName })))
      return;
    try {
      await variantsApi.delete(productId, v.id);
      onUpdate(variants.filter((x) => x.id !== v.id));
    } catch {
      /* noop */
    }
  }

  function addTier() {
    setForm((f) => ({ ...f, tiers: [...f.tiers, { minQuantity: 1, priceCny: 0 }] }));
  }

  function removeTier(i: number) {
    setForm((f) => ({ ...f, tiers: f.tiers.filter((_, idx) => idx !== i) }));
  }

  function updateTier(i: number, field: keyof PriceTierRequest, value: string) {
    setForm((f) => ({
      ...f,
      tiers: f.tiers.map((tier, idx) =>
        idx === i
          ? {
              ...tier,
              [field]:
                field === "maxQuantity"
                  ? value === "" ? undefined : parseInt(value)
                  : parseFloat(value) || 0,
            }
          : tier
      ),
    }));
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus size={15} weight="bold" />
          {t("product.add_variant")}
        </Button>
      </div>

      {/* Variant form panel */}
      {editingId !== null && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-4 font-heading font-semibold text-slate-800">
            {editingId === "new" ? t("product.add_variant") : t("product.edit_variant")}
          </h3>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <Input
              label={t("product.variant_name")}
              value={form.variantName}
              onChange={(e) => setForm((f) => ({ ...f, variantName: e.target.value }))}
              required
            />
            <Input
              label={t("product.translated_name")}
              value={form.translatedName}
              onChange={(e) => setForm((f) => ({ ...f, translatedName: e.target.value }))}
            />
            <Input
              label={t("product.price_cny")}
              type="number"
              min="0"
              step="0.01"
              value={form.priceCny}
              onChange={(e) => setForm((f) => ({ ...f, priceCny: e.target.value }))}
              required
            />
            <Input
              label={t("product.stock")}
              type="number"
              min="0"
              value={form.stockRaw}
              onChange={(e) => setForm((f) => ({ ...f, stockRaw: e.target.value }))}
            />
            <Input
              label={t("product.image_url")}
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
            <Input
              label={t("product.sort_order")}
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </div>

          {editingId !== "new" && (
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                className="rounded border-slate-300"
              />
              {t("product.is_available")}
            </label>
          )}

          {/* Price tiers */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{t("product.price_tiers")}</p>
              <button
                type="button"
                onClick={addTier}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus size={13} weight="bold" />
                {t("product.add_price_tier")}
              </button>
            </div>
            {form.tiers.length > 0 && (
              <div className="space-y-2">
                {form.tiers.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      label={i === 0 ? t("product.tier_min_qty") : ""}
                      type="number"
                      min="1"
                      value={tier.minQuantity.toString()}
                      onChange={(e) => updateTier(i, "minQuantity", e.target.value)}
                      className="w-28"
                    />
                    <Input
                      label={i === 0 ? t("product.tier_max_qty") : ""}
                      type="number"
                      min="1"
                      placeholder="∞"
                      value={tier.maxQuantity?.toString() ?? ""}
                      onChange={(e) => updateTier(i, "maxQuantity", e.target.value)}
                      className="w-28"
                    />
                    <Input
                      label={i === 0 ? t("product.tier_price_cny") : ""}
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.priceCny.toString()}
                      onChange={(e) => updateTier(i, "priceCny", e.target.value)}
                      className="w-32"
                    />
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className={cn(
                        "rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600",
                        i === 0 ? "mt-5" : ""
                      )}
                      title={t("common.delete")}
                    >
                      <X size={16} weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
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
              {t("product.save_variant")}
            </Button>
          </div>
        </div>
      )}

      {/* Variants table */}
      {variants.length === 0 ? (
        <EmptyState icon={<Package size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("product.col_variants")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("product.col_current_price")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("product.col_min_price")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("product.col_stock")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("product.col_availability")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("product.col_price_tiers")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {v.imageUrl && (
                        <img
                          src={v.imageUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded bg-slate-100 object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{v.translatedName ?? v.variantName}</p>
                        {v.translatedName && <p className="text-xs text-slate-400">{v.variantName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatCNY(v.priceCnyCurrent)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-500">
                    {v.priceCnyMin != null ? formatCNY(v.priceCnyMin) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {v.stockRaw != null ? v.stockRaw.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.isAvailable ? (
                      <Badge variant="success">{t("product.in_stock")}</Badge>
                    ) : (
                      <Badge variant="default">{t("product.out_of_stock")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                    {v.priceTiers.length > 0 ? t("product.tiers_count", { count: v.priceTiers.length }) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-blue-100 hover:text-blue-600 active:scale-95"
                        title={t("product.edit_variant")}
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(v)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                        title={t("product.delete_variant")}
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

// ── Images tab ────────────────────────────────────────────────────────────────

function ImagesTab({
  productId,
  images,
  onUpdate,
}: {
  productId: string;
  images: ProductImage[];
  onUpdate: (imgs: ProductImage[]) => void;
}) {
  const { t } = useTranslation();
  const [sourceUrl, setSourceUrl] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const body: AddImageRequest = {
        sourceUrl: sourceUrl.trim(),
        isPrimary,
        sortOrder: images.length,
      };
      const res = await imagesApi.add(productId, body);
      onUpdate([...images, res.data]);
      setSourceUrl("");
      setIsPrimary(false);
      setShowForm(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setAdding(false);
    }
  }

  async function handleSetPrimary(img: ProductImage) {
    try {
      const res = await imagesApi.setPrimary(productId, img.id);
      onUpdate(images.map((i) => (i.id === img.id ? res.data : { ...i, isPrimary: false })));
    } catch {
      /* noop */
    }
  }

  async function handleDelete(img: ProductImage) {
    if (!confirm(t("product.delete_image_confirm"))) return;
    try {
      await imagesApi.delete(productId, img.id);
      onUpdate(images.filter((i) => i.id !== img.id));
    } catch {
      /* noop */
    }
  }

  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5">
          <Plus size={15} weight="bold" />
          {t("product.add_image")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <Input
            label={t("product.image_source_url")}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            required
            className="min-w-52 flex-1"
          />
          <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("product.is_primary")}
          </label>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pb-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" loading={adding}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<ImageIcon size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {sorted.map((img) => (
            <div key={img.id} className="group relative aspect-square">
              <img
                src={img.url}
                alt=""
                className="h-full w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
              />
              {img.isPrimary && (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-white">
                  {t("product.image_primary")}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-xl bg-black/0 opacity-0 transition-colors group-hover:bg-black/30 group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img)}
                    title={t("product.set_primary")}
                    className="rounded-lg bg-white p-1.5 text-slate-600 transition-colors hover:bg-primary hover:text-white"
                  >
                    <Star size={15} weight="fill" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img)}
                  title={t("common.delete")}
                  className="rounded-lg bg-white p-1.5 text-slate-600 transition-colors hover:bg-red-500 hover:text-white"
                >
                  <Trash size={15} />
                </button>
              </div>
              <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-xs text-white">
                #{img.sortOrder}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Attributes tab ────────────────────────────────────────────────────────────

function AttributesTab({ attributes }: { attributes: ProductDetail["attributes"] }) {
  const { t } = useTranslation();
  if (attributes.length === 0) {
    return <EmptyState icon={<Package size={40} />} title={t("common.no_data")} />;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{t("product.attr_key_cn")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("product.attr_key_vn")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("product.attr_val_cn")}</th>
            <th className="px-4 py-3 text-left font-medium">{t("product.attr_val_vn")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {attributes.map((attr, i) => (
            <tr key={i} className="transition-colors hover:bg-slate-50">
              <td className="px-4 py-2 text-slate-500">{attr.keyCn ?? "—"}</td>
              <td className="px-4 py-2 font-medium text-slate-900">{attr.keyVn ?? "—"}</td>
              <td className="px-4 py-2 text-slate-500">{attr.valueCn ?? "—"}</td>
              <td className="px-4 py-2 text-slate-900">{attr.valueVn ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function flattenTree(
  nodes: CategoryTree[],
  depth = 0
): Array<CategoryTree & { prefix: string }> {
  return nodes.flatMap((c) => [
    { ...c, prefix: "　".repeat(depth) },
    ...flattenTree(c.children ?? [], depth + 1),
  ]);
}
