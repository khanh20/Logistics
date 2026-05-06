export interface ProductListItem {
  id: string;
  slug: string;
  originalTitle: string;
  translatedTitle: string | null;
  primaryImageUrl: string | null;
  minPriceCny: number;
  maxPriceCny: number;
  variantCount: number;
  isForbidden: boolean;
  isFeatured: boolean;
  platformName: string;
  shopName: string;
}

export interface ProductDetail {
  id: string;
  slug: string;
  originalTitle: string;
  translatedTitle: string | null;
  seoDescription: string | null;
  originalUrl: string;
  isForbidden: boolean;
  forbiddenReason: string | null;
  isFeatured: boolean;
  isActive: boolean;
  viewCount: number;
  lastPriceSyncedAt: string | null;
  category: CategorySlim;
  shop: ShopSlim;
  variants: ProductVariant[];
  images: ProductImage[];
  attributes: ProductAttribute[];
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  variantName: string;
  translatedName: string | null;
  priceCnyCurrent: number;
  priceCnyMin: number | null;
  stockRaw: number | null;
  isAvailable: boolean;
  imageUrl: string | null;
  priceTiers: PriceTier[];
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity: number | null;
  priceCny: number;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductAttribute {
  keyVn: string | null;
  keyCn: string | null;
  valueVn: string | null;
  valueCn: string | null;
}

export interface CategorySlim {
  id: string;
  nameVn: string;
  slug: string;
}

export interface ShopSlim {
  id: string;
  shopName: string;
  platformName: string;
  internalRating: number;
}

export interface PagedProductResponse {
  items: ProductListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProductSearchParams {
  keyword?: string;
  categoryId?: string;
  platformId?: string;
  minPriceCny?: number;
  maxPriceCny?: number;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

// ── Request types ─────────────────────────────────────────────────────────────

export interface UpsertProductRequest {
  shopId: string;
  categoryId: string;
  platformProductId: string;
  originalTitle: string;
  slug: string;
  originalUrl: string;
  translatedTitle?: string;
  seoDescription?: string;
  crawlTaskId?: string;
  variants: UpsertVariantRequest[];
  images: UpsertImageRequest[];
  attributes: UpsertAttributeRequest[];
}

export interface UpsertVariantRequest {
  variantName: string;
  translatedName?: string;
  priceCny: number;
  skuIdOnPlatform?: string;
  stockRaw?: number;
  imageUrl?: string;
  sortOrder?: number;
  priceTiers?: PriceTierRequest[];
}

export interface UpsertImageRequest {
  sourceUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  sourceUrlHash?: string;
}

export interface UpsertAttributeRequest {
  keyCn?: string;
  keyVn?: string;
  valueCn?: string;
  valueVn?: string;
  sortOrder?: number;
}

export interface AddVariantRequest {
  variantName: string;
  translatedName?: string;
  priceCny: number;
  skuIdOnPlatform?: string;
  stockRaw?: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateVariantRequest {
  variantName: string;
  translatedName?: string;
  priceCny: number;
  stockRaw?: number;
  isAvailable: boolean;
  imageUrl?: string;
  sortOrder?: number;
}

export interface PriceTierRequest {
  minQuantity: number;
  maxQuantity?: number;
  priceCny: number;
}

export interface SyncPriceTiersRequest {
  tiers: PriceTierRequest[];
}

export interface AddImageRequest {
  sourceUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  sourceUrlHash?: string;
}

export interface ImageOrderItem {
  id: string;
  sortOrder: number;
}

export interface ReorderImagesRequest {
  items: ImageOrderItem[];
}

/// PATCH /api/products/{id}/info — Admin only, update basic info by product Id.
export interface UpdateProductInfoRequest {
  translatedTitle?: string;
  seoDescription?: string;
  categoryId: string;
}
