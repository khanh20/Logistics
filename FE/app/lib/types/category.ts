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
