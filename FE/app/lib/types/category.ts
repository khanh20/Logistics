export interface CategoryTree {
  id: string;
  nameVn: string;
  nameCn: string | null;
  slug: string;
  iconUrl: string | null;
  sortOrder: number;
  children: CategoryTree[];
}

export interface CreateCategoryRequest {
  nameVn: string;
  nameCn?: string;
  slug: string;
  parentId?: string;
  iconUrl?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  nameVn: string;
  nameCn?: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ForbiddenCategory {
  id: string;
  name: string;
  keywordsCn: string | null;
  keywordsVn: string | null;
  reason: string;
  severity: string;
  isActive: boolean;
}

export interface CreateForbiddenCategoryRequest {
  name: string;
  reason: string;
  keywordsCn?: string;
  keywordsVn?: string;
  severity?: string;
}

export interface ExchangeRate {
  id: string;
  rateVndPerCny: number;
  source: string;
  isCurrent: boolean;
  effectiveFrom: string;
}

export interface CrawlResultResponse {
  platformName: string;
  keyword: string;
  totalFound: number;
  saved: number;
  skipped: number;
  forbidden: number;
  items: CrawlItemResult[];
}

export interface CrawlItemResult {
  platformProductId: string;
  title: string;
  savedProductId: string | null;
  status: "Created" | "Updated" | "Skipped" | "Forbidden" | "Error";
  reason: string | null;
}

export interface CrawlUrlResultResponse {
  platformName: string;
  platformProductId: string;
  savedProductId: string | null;
  status: string;
  reason: string | null;
}

// ── Resolve URL (customer dán link) ─────────────────────────────────────────
import type { ScrapedData } from "~/lib/extension/bridge";
import type { ProductDetail } from "~/lib/types/product";

export interface ResolveUrlRequest {
  url: string;
  categoryId?: string;
  // 1688/Taobao/Tmall: extension scrape sẵn rồi gửi kèm.
  scrapedData?: ExtensionScrapedDataPayload;
}

// Payload gửi BE — map từ ScrapedData (bridge) nhưng KHÔNG có quantity.
export interface ExtensionScrapedDataPayload {
  platform: string;
  platformProductId: string;
  shopIdOnPlatform: string;
  shopName: string;
  shopUrl: string | null;
  titleOriginal: string;
  titleTranslated: string | null;
  priceOriginal: number;
  pricePromotion: number | null;
  currency: string;
  stock: number | null;
  primaryImageUrl: string | null;
  imageUrls: string[];
  propertiesTranslated: string | null;
  propertiesOriginal: string | null;
  selectedSkuId: string | null;
  priceTiers: { minQuantity: number; maxQuantity: number | null; priceOriginal: number }[];
  confidenceTier: string | null;
}

export interface ResolveUrlResponse {
  platformName: string;
  productId: string | null;
  status: "Resolved" | "NeedExtension" | "Forbidden" | "Error";
  reason: string | null;
  product: ProductDetail | null;
}

// Map ScrapedData (từ extension) → payload BE.
export function toScrapedPayload(d: ScrapedData): ExtensionScrapedDataPayload {
  return {
    platform: d.platform,
    platformProductId: d.platformProductId,
    shopIdOnPlatform: d.shopIdOnPlatform,
    shopName: d.shopName,
    shopUrl: d.shopUrl,
    titleOriginal: d.titleOriginal,
    titleTranslated: d.titleTranslated,
    priceOriginal: d.priceOriginal,
    pricePromotion: d.pricePromotion,
    currency: d.currency,
    stock: d.stock,
    primaryImageUrl: d.primaryImageUrl,
    imageUrls: d.imageUrls,
    propertiesTranslated: d.propertiesTranslated,
    propertiesOriginal: d.propertiesOriginal,
    selectedSkuId: d.selectedSkuId,
    priceTiers: d.priceTiers,
    confidenceTier: d.confidence,
  };
}
