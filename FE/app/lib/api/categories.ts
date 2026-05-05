import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  CategoryTree,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ForbiddenCategory,
  CreateForbiddenCategoryRequest,
  ExchangeRate,
  CrawlResultResponse,
  CrawlUrlResultResponse,
} from "~/lib/types/category";

export const categoriesApi = {
  getTree: () =>
    apiModule1Client.get<unknown, ApiResponse<CategoryTree[]>>("/api/categories"),

  getById: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<CategoryTree>>(`/api/categories/${id}`),

  create: (body: CreateCategoryRequest) =>
    apiModule1Client.post<unknown, ApiResponse<CategoryTree>>("/api/categories", body),

  update: (id: string, body: UpdateCategoryRequest) =>
    apiModule1Client.put<unknown, ApiResponse<CategoryTree>>(`/api/categories/${id}`, body),

  delete: (id: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(`/api/categories/${id}`),
};

export const forbiddenCategoriesApi = {
  getAll: () =>
    apiModule1Client.get<unknown, ApiResponse<ForbiddenCategory[]>>("/api/forbidden-categories"),

  create: (body: CreateForbiddenCategoryRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ForbiddenCategory>>(
      "/api/forbidden-categories",
      body
    ),

  update: (id: string, body: CreateForbiddenCategoryRequest) =>
    apiModule1Client.put<unknown, ApiResponse<ForbiddenCategory>>(
      `/api/forbidden-categories/${id}`,
      body
    ),
};

export const exchangeRatesApi = {
  getCurrent: () =>
    apiModule1Client.get<unknown, ApiResponse<ExchangeRate>>("/api/exchange-rates/current"),

  getHistory: (limit = 30) =>
    apiModule1Client.get<unknown, ApiResponse<ExchangeRate[]>>("/api/exchange-rates/history", {
      params: { limit },
    }),

  update: (rateVndPerCny: number, source: string) =>
    apiModule1Client.put<unknown, ApiResponse<ExchangeRate>>("/api/exchange-rates", {
      rateVndPerCny,
      source,
    }),
};

export const ingestionApi = {
  getAvailablePlatforms: () =>
    apiModule1Client.get<unknown, ApiResponse<string[]>>("/api/ingestion/platforms"),

  crawlByKeyword: (body: {
    platformName: string;
    keyword: string;
    maxResults?: number;
    categoryId?: string;
  }) =>
    apiModule1Client.post<unknown, ApiResponse<CrawlResultResponse>>(
      "/api/ingestion/crawl/keyword",
      body
    ),

  crawlByUrl: (body: { url: string; categoryId?: string }) =>
    apiModule1Client.post<unknown, ApiResponse<CrawlUrlResultResponse>>(
      "/api/ingestion/crawl/url",
      body
    ),
};
