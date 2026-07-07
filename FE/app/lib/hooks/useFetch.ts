import { useCallback, useEffect, useRef, useState } from "react";

export interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /// Tải lại (dùng sau mutation thay cho useRevalidator).
  reload: () => void;
  /// Cập nhật cục bộ data (optimistic).
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

// Non-blocking data loading: render màn hình NGAY, dữ liệu tải sau (skeleton).
// Thay cho clientLoader (vốn chặn điều hướng tới khi load xong → UX kém).
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []): UseFetchResult<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => { if (alive) setDataState(d); })
      .catch((e: unknown) => {
        if (alive) setError((e as { message?: string })?.message ?? "Đã có lỗi xảy ra.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => run(), [run]);

  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setDataState((prev) =>
      typeof updater === "function" ? (updater as (p: T | null) => T)(prev) : updater
    );
  }, []);

  return { data, loading, error, reload: run, setData };
}
