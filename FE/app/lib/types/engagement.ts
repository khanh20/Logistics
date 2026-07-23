import type { ProductListItem } from "./product";

// ── Activity tracking ──────────────────────────────────────────────────────────
export type ActivityType = "View" | "Search" | "AddToCart" | "Purchase";

export interface TrackActivityRequest {
  type: ActivityType;
  productId?: string;
  categoryId?: string;
  keyword?: string;
  sessionKey?: string;
}

// ── Recommendation ─────────────────────────────────────────────────────────────
export interface RecSection {
  key: string;
  products: ProductListItem[];
}

export interface RecommendationResponse {
  segment: string;
  sections: RecSection[];
}

// ── Reviews ────────────────────────────────────────────────────────────────────
export type ReviewStatus = "Pending" | "Approved" | "Rejected";

export interface ReviewResponse {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  content: string;
  status: ReviewStatus;
  rejectReason: string | null;
  createdAt: string;
  aiSpamScore: number | null;
  aiScannedAt: string | null;
}

export interface PagedReviewResponse {
  items: ReviewResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SubmitReviewRequest {
  rating: number;
  content: string;
}

export interface ModerateReviewRequest {
  approve: boolean;
  reason?: string;
}
