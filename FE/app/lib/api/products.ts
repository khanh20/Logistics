import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  PagedProductResponse,
  ProductDetail,
  ProductListItem,
  ProductSearchParams,
  ProductVariant,
  ProductImage,
  UpsertProductRequest,
  UpdateProductInfoRequest,
  AddVariantRequest,
  UpdateVariantRequest,
  SyncPriceTiersRequest,
  AddImageRequest,
  ReorderImagesRequest,
} from "~/lib/types/product";

export const productsApi = {
  search: (params: ProductSearchParams) =>
    apiModule1Client.get<unknown, ApiResponse<PagedProductResponse>>("/api/products", { params }),

  getBySlug: (slug: string) =>
    apiModule1Client.get<unknown, ApiResponse<ProductDetail>>(`/api/products/slug/${slug}`),

  getById: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<ProductDetail>>(`/api/products/${id}`),

  getFeatured: (limit = 10) =>
    apiModule1Client.get<unknown, ApiResponse<ProductListItem[]>>("/api/products/featured", {
      params: { limit },
    }),

  /// Admin-only: get full product detail WITHOUT incrementing view count.
  getDetailForAdmin: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<ProductDetail>>(`/api/products/${id}/admin-detail`),

  /// Admin-only: update translatedTitle, seoDescription, categoryId by product Id.
  updateInfo: (id: string, body: UpdateProductInfoRequest) =>
    apiModule1Client.patch<unknown, ApiResponse<ProductDetail>>(`/api/products/${id}/info`, body),

  upsert: (body: UpsertProductRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ProductDetail>>("/api/products", body),

  setFeatured: (id: string, featured: boolean) =>
    apiModule1Client.patch<unknown, ApiResponse<ProductDetail>>(
      `/api/products/${id}/featured`,
      null,
      { params: { featured } }
    ),

  deactivate: (id: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(`/api/products/${id}`),
};

export const variantsApi = {
  getByProduct: (productId: string) =>
    apiModule1Client.get<unknown, ApiResponse<ProductVariant[]>>(
      `/api/products/${productId}/variants`
    ),

  add: (productId: string, body: AddVariantRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ProductVariant>>(
      `/api/products/${productId}/variants`,
      body
    ),

  update: (productId: string, variantId: string, body: UpdateVariantRequest) =>
    apiModule1Client.put<unknown, ApiResponse<ProductVariant>>(
      `/api/products/${productId}/variants/${variantId}`,
      body
    ),

  delete: (productId: string, variantId: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(
      `/api/products/${productId}/variants/${variantId}`
    ),

  syncPriceTiers: (productId: string, variantId: string, body: SyncPriceTiersRequest) =>
    apiModule1Client.put<unknown, ApiResponse<ProductVariant>>(
      `/api/products/${productId}/variants/${variantId}/price-tiers`,
      body
    ),
};

export const imagesApi = {
  getByProduct: (productId: string) =>
    apiModule1Client.get<unknown, ApiResponse<ProductImage[]>>(
      `/api/products/${productId}/images`
    ),

  add: (productId: string, body: AddImageRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ProductImage>>(
      `/api/products/${productId}/images`,
      body
    ),

  setPrimary: (productId: string, imageId: string) =>
    apiModule1Client.patch<unknown, ApiResponse<ProductImage>>(
      `/api/products/${productId}/images/${imageId}/primary`,
      null
    ),

  reorder: (productId: string, body: ReorderImagesRequest) =>
    apiModule1Client.put<unknown, ApiResponse<null>>(
      `/api/products/${productId}/images/reorder`,
      body
    ),

  delete: (productId: string, imageId: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(
      `/api/products/${productId}/images/${imageId}`
    ),
};
