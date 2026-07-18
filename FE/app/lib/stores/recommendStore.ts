import { useEffect, useState } from "react";
import { create } from "zustand";
import { recommendationsApi } from "~/lib/api/engagement";
import { getSessionKey } from "~/lib/utils/session";
import { useAppSelector } from "~/lib/feature/hooks";
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
        // Chỉ ghi nếu key vẫn là key hiện hành → tránh kết quả cũ/vô danh (resolve muộn)
        // ghi đè kết quả mới/đã-đăng-nhập (chống đua khi token vừa sẵn sàng).
        if (get().key === key) set({ data: d, fetchedAt: Date.now(), inflight: null });
        return d;
      })
      .catch((e) => {
        if (get().key === key) set({ inflight: null });
        throw e;
      });

    // Đổi ngữ cảnh (vô danh → đăng nhập, hoặc đổi tài khoản): key khác key của data
    // hiện tại → XÓA data cũ để KHÔNG hiện nhãn phân khúc sai (vd "Khách mới" của phiên
    // vô danh còn trong cache) trong lúc chờ dữ liệu mới về.
    const contextChanged = s.key !== null && s.key !== key;
    set(contextChanged ? { key, inflight: p, data: null, fetchedAt: 0 } : { key, inflight: p });
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
  // Đọc token REACTIVE: mọi component gọi useRecommend thấy cùng một giá trị token,
  // và khi token vừa sẵn sàng (đăng nhập/hydrate) effect chạy lại → fetch có xác thực.
  const token = useAppSelector((s) => s.authState.token);
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    let alive = true;
    const key = token ? `auth:${token.slice(-12)}` : `anon:${getSessionKey()}`;
    setLoading(true); // đổi ngữ cảnh (đăng nhập) → hiện skeleton trong lúc chờ, không hiện nhãn cũ
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
  }, [load, token]);

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
