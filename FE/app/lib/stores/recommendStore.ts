import { useEffect, useState } from "react";
import { create } from "zustand";
import { recommendationsApi } from "~/lib/api/engagement";
import { getSessionKey } from "~/lib/utils/session";
import { store } from "~/lib/feature/store";
import type { RecommendationResponse } from "~/lib/types/engagement";
import type { ProductListItem } from "~/lib/types/product";

// Cache recommend ở client (zustand): API recommend nặng nên tránh gọi lại mỗi lần
// chuyển trang. Dedupe request đang bay + TTL 5 phút, key theo token/session.
const TTL_MS = 5 * 60 * 1000;

interface RecommendState {
  data: RecommendationResponse | null;
  key: string | null;
  fetchedAt: number;
  inflight: Promise<RecommendationResponse> | null;
  load: (key: string, fetcher: () => Promise<RecommendationResponse>) => Promise<RecommendationResponse>;
  clear: () => void;
}

export const useRecommendStore = create<RecommendState>()((set, get) => ({
  data: null,
  key: null,
  fetchedAt: 0,
  inflight: null,

  async load(key, fetcher) {
    const s = get();
    const fresh = s.data && s.key === key && Date.now() - s.fetchedAt < TTL_MS;
    if (fresh) return s.data!;
    if (s.inflight && s.key === key) return s.inflight;

    const p = fetcher()
      .then((d) => {
        set({ data: d, key, fetchedAt: Date.now(), inflight: null });
        return d;
      })
      .catch((e) => {
        set({ inflight: null });
        throw e;
      });

    set({ key, inflight: p });
    return p;
  },

  clear() {
    set({ data: null, key: null, fetchedAt: 0, inflight: null });
  },
}));

// Hook dùng chung: trigger load (cache) + trả dữ liệu recommend.
export function useRecommend() {
  const data = useRecommendStore((s) => s.data);
  const load = useRecommendStore((s) => s.load);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    let alive = true;
    const token = store.getState().authState.token;
    const key = token ? `auth:${token.slice(-12)}` : `anon:${getSessionKey()}`;
    load(key, async () =>
      (await recommendationsApi.get({ sessionKey: getSessionKey(), perSection: 12 })).data
    )
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [load]);

  return { data, loading };
}

// Lấy products của 1 section theo key (cho rail/banner).
export function pickSection(data: RecommendationResponse | null, ...keys: string[]) {
  if (!data) return [];
  for (const k of keys) {
    const s = data.sections.find((x) => x.key === k && x.products.length > 0);
    if (s) return s.products;
  }
  return [];
}

// Sản phẩm cho rail 2 bên: ưu tiên section theo keys; nếu KHÔNG có (vd user đã đăng nhập
// → recommend trả recently_viewed/similar_to_viewed mà rail không match, hoặc trending bị
// lọc trùng thành rỗng) thì lấy tạm từ "pool" gộp mọi section để rail luôn có hàng — khỏi
// để trống 2 bên. Rail phải dùng tail=true để lấy phần cuối pool, tránh trùng rail trái.
export function pickRailProducts(
  data: RecommendationResponse | null,
  keys: string[],
  opts: { count?: number; tail?: boolean } = {},
): ProductListItem[] {
  const count = opts.count ?? 3;
  if (!data) return [];
  for (const k of keys) {
    const s = data.sections.find((x) => x.key === k && x.products.length > 0);
    if (s) return s.products.slice(0, count);
  }
  const seen = new Set<string>();
  const pool: ProductListItem[] = [];
  for (const s of data.sections)
    for (const p of s.products)
      if (!seen.has(p.id)) {
        seen.add(p.id);
        pool.push(p);
      }
  if (pool.length === 0) return [];
  return opts.tail ? pool.slice(-count).reverse() : pool.slice(0, count);
}
