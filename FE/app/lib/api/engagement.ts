import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type { ProductListItem } from "~/lib/types/product";
import type {
  RecommendationResponse,
  TrackActivityRequest,
  PagedReviewResponse,
  ReviewResponse,
  SubmitReviewRequest,
  ModerateReviewRequest,
  ReviewStatus,
} from "~/lib/types/engagement";

export const recommendationsApi = {
  get: (params?: { sessionKey?: string; perSection?: number }) =>
    apiModule1Client.get<unknown, ApiResponse<RecommendationResponse>>("/api/recommendations", { params }),
};

export const activityApi = {
  // Best-effort — không chặn UI, nuốt lỗi tại nơi gọi.
  track: (body: TrackActivityRequest) =>
    apiModule1Client.post<unknown, ApiResponse<unknown>>("/api/activity", body),
};

export const favoritesApi = {
  list: () =>
    apiModule1Client.get<unknown, ApiResponse<ProductListItem[]>>("/api/favorites"),
  add: (productId: string) =>
    apiModule1Client.post<unknown, ApiResponse<boolean>>(`/api/favorites/${productId}`),
  remove: (productId: string) =>
    apiModule1Client.delete<unknown, ApiResponse<boolean>>(`/api/favorites/${productId}`),
};

export const reviewsApi = {
  getApproved: (productId: string, page = 1, pageSize = 20) =>
    apiModule1Client.get<unknown, ApiResponse<PagedReviewResponse>>(
      `/api/products/${productId}/reviews`,
      { params: { page, pageSize } }
    ),
  getMine: (productId: string) =>
    apiModule1Client.get<unknown, ApiResponse<ReviewResponse | null>>(
      `/api/products/${productId}/reviews/mine`
    ),
  submit: (productId: string, body: SubmitReviewRequest) =>
    apiModule1Client.post<unknown, ApiResponse<ReviewResponse>>(
      `/api/products/${productId}/reviews`,
      body
    ),

  // ── Admin/Staff moderation ──
  getQueue: (status?: ReviewStatus, page = 1, pageSize = 20) =>
    apiModule1Client.get<unknown, ApiResponse<PagedReviewResponse>>("/api/manage/reviews", {
      params: { status, page, pageSize },
    }),
  moderate: (reviewId: string, body: ModerateReviewRequest) =>
    apiModule1Client.patch<unknown, ApiResponse<ReviewResponse>>(
      `/api/manage/reviews/${reviewId}/moderate`,
      body
    ),
};
