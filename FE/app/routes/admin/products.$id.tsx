import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/products.$id";
import { productsApi, variantsApi, imagesApi } from "~/lib/api/products";
import { categoriesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";
import { Input } from "~/components/ui/Input";
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

export function meta({ data }: Route.MetaArgs) {
  const p = (data as { product: ProductDetail } | undefined)?.product;
  const title = p?.translatedTitle ?? p?.originalTitle ?? "Chi tiết sản phẩm";
  return [{ title: `${title} — MuaHo Admin` }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [productRes, categoriesRes] = await Promise.all([
    productsApi.getDetailForAdmin(params.id!),   // admin endpoint — no view-count increment
    categoriesApi.getTree(),
  ]);
  return { product: productRes.data, categories: categoriesRes.data };
}

type Tab = "info" | "variants" | "images" | "attributes";

export default function ProductDetailPage({
  loaderData,
}: {
  loaderData: { product: ProductDetail; categories: CategoryTree[] };
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(loaderData.product);
  const [variants, setVariants] = useState<ProductVariant[]>(loaderData.product.variants);
  const [images, setImages] = useState<ProductImage[]>(loaderData.product.images);
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
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <Link
            to="/admin/products"
            className="text-sm text-gray-500 hover:text-primary transition-colors"
          >
            ← {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold text-gray-900 leading-snug mt-1">
            {product.translatedTitle ?? product.originalTitle}
          </h1>
          {product.translatedTitle && (
            <p className="text-sm text-gray-500 mt-0.5">{product.originalTitle}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {product.isFeatured && (
              <Badge variant="info">{t("product.featured_badge")}</Badge>
            )}
            {product.isForbidden && (
              <Badge variant="error">{t("product.forbidden_badge")}</Badge>
            )}
            {product.isActive ? (
              <Badge variant="success">{t("product.active_badge")}</Badge>
            ) : (
              <Badge variant="default">{t("product.inactive_badge")}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant={product.isFeatured ? "secondary" : "primary"}
            size="sm"
            loading={actionLoading}
            onClick={handleToggleFeatured}
          >
            {product.isFeatured
              ? `★ ${t("product.toggle_featured_off")}`
              : `☆ ${t("product.toggle_featured_on")}`}
          </Button>
          {product.isActive && (
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleDeactivate}
            >
              {t("product.deactivate")}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "info" && (
        <InfoTab
          product={product}
          categories={loaderData.categories}
          onUpdate={setProduct}
        />
      )}
      {activeTab === "variants" && (
        <VariantsTab
          productId={product.id}
          variants={variants}
          onUpdate={setVariants}
        />
      )}
      {activeTab === "images" && (
        <ImagesTab
          productId={product.id}
          images={images}
          onUpdate={setImages}
        />
      )}
      {activeTab === "attributes" && (
        <AttributesTab attributes={product.attributes} />
      )}
    </div>
  );
}

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
      value: (
        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{product.slug}</code>
      ),
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
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          className="text-primary hover:underline truncate block max-w-sm"
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
          className="h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
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
      value: `${product.shop.shopName} · ${product.shop.platformName} · ★ ${product.shop.internalRating.toFixed(1)}`,
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
      <div className="flex justify-end mb-3">
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
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t("product.edit_info")}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <dl className="divide-y divide-gray-100">
          {rows.map(({ label, value }) => (
            <div key={label} className="px-6 py-3 grid grid-cols-3 gap-4">
              <dt className="text-sm font-medium text-gray-500 col-span-1">{label}</dt>
              <dd className="text-sm text-gray-900 col-span-2">{value}</dd>
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
        // Sync price tiers if any
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
    setForm((f) => ({
      ...f,
      tiers: [...f.tiers, { minQuantity: 1, priceCny: 0 }],
    }));
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
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={openAdd}>
          + {t("product.add_variant")}
        </Button>
      </div>

      {/* Variant form panel */}
      {editingId !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
          <h3 className="font-semibold text-gray-800 mb-4">
            {editingId === "new" ? t("product.add_variant") : t("product.edit_variant")}
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
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
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                className="rounded border-gray-300"
              />
              {t("product.is_available")}
            </label>
          )}

          {/* Price tiers */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{t("product.price_tiers")}</p>
              <button
                type="button"
                onClick={addTier}
                className="text-xs text-primary hover:underline"
              >
                + {t("product.add_price_tier")}
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
                        "text-red-400 hover:text-red-600 transition-colors text-lg leading-none",
                        i === 0 ? "mt-5" : ""
                      )}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">{t("product.col_variants")}</th>
              <th className="px-4 py-3 text-right">{t("product.col_current_price")}</th>
              <th className="px-4 py-3 text-right">{t("product.col_min_price")}</th>
              <th className="px-4 py-3 text-right">{t("product.col_stock")}</th>
              <th className="px-4 py-3 text-center">{t("product.col_availability")}</th>
              <th className="px-4 py-3 text-center">{t("product.col_price_tiers")}</th>
              <th className="px-4 py-3 text-center">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {v.imageUrl && (
                      <img
                        src={v.imageUrl}
                        alt=""
                        className="w-8 h-8 object-cover rounded bg-gray-100 shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {v.translatedName ?? v.variantName}
                      </p>
                      {v.translatedName && (
                        <p className="text-xs text-gray-400">{v.variantName}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatCNY(v.priceCnyCurrent)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">
                  {v.priceCnyMin != null ? formatCNY(v.priceCnyMin) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {v.stockRaw != null ? v.stockRaw.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  {v.isAvailable ? (
                    <Badge variant="success">{t("product.in_stock")}</Badge>
                  ) : (
                    <Badge variant="default">{t("product.out_of_stock")}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">
                  {v.priceTiers.length > 0
                    ? t("product.tiers_count", { count: v.priceTiers.length })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(v)}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors text-sm"
                      title={t("product.edit_variant")}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors text-sm"
                      title={t("product.delete_variant")}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {variants.length === 0 && (
          <p className="text-center text-gray-400 py-10">{t("common.no_data")}</p>
        )}
      </div>
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
      onUpdate(
        images.map((i) =>
          i.id === img.id ? res.data : { ...i, isPrimary: false }
        )
      );
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
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          + {t("product.add_image")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3"
        >
          <Input
            label={t("product.image_source_url")}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            required
            className="flex-1 min-w-52"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pb-1">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t("product.is_primary")}
          </label>
          {error && (
            <p className="w-full text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2 pb-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" loading={adding}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          {t("common.no_data")}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {sorted.map((img) => (
            <div key={img.id} className="relative group aspect-square">
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover rounded-xl border border-gray-200 bg-gray-100"
              />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                  {t("product.image_primary")}
                </span>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img)}
                    title={t("product.set_primary")}
                    className="p-1 bg-white rounded-lg text-xs hover:bg-primary hover:text-white transition-colors"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img)}
                  title={t("common.delete")}
                  className="p-1 bg-white rounded-lg text-xs hover:bg-red-500 hover:text-white transition-colors"
                >
                  🗑
                </button>
              </div>
              <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1 py-0.5 rounded">
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
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">{t("product.attr_key_cn")}</th>
            <th className="px-4 py-3 text-left">{t("product.attr_key_vn")}</th>
            <th className="px-4 py-3 text-left">{t("product.attr_val_cn")}</th>
            <th className="px-4 py-3 text-left">{t("product.attr_val_vn")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {attributes.map((attr, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-500">{attr.keyCn ?? "—"}</td>
              <td className="px-4 py-2 font-medium text-gray-900">{attr.keyVn ?? "—"}</td>
              <td className="px-4 py-2 text-gray-500">{attr.valueCn ?? "—"}</td>
              <td className="px-4 py-2 text-gray-900">{attr.valueVn ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {attributes.length === 0 && (
        <p className="text-center text-gray-400 py-10">{t("common.no_data")}</p>
      )}
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
