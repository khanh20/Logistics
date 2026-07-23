import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import type { ApiResponse } from "~/lib/types/common";
import type { RefreshResponse } from "~/lib/types/auth";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:7237";

// ── Helper: đọc token từ localStorage (authSlice luôn persist "muaho-auth") ────
// Không import store ở tầng module để tránh vòng import store → authSlice →
// authThunk → api/auth → client → store (gây TDZ "Cannot access 'login'...").
function readAuth(): { token?: string | null; refreshToken?: string | null } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("muaho-auth") || "{}");
  } catch {
    return {};
  }
}

function getToken(): string | null {
  return readAuth().token ?? null;
}

function getRefreshToken(): string | null {
  return readAuth().refreshToken ?? null;
}

function handleLogout(): void {
  localStorage.removeItem("muaho-auth");
  window.location.href = "/login";
}

// ── Auth client (no refresh interceptor — prevents infinite loop) ─────────────
function createAuthClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    const isAuthEndpoint = config.url?.includes("/login") || config.url?.includes("/register") || config.url?.includes("/refresh");
    if (token && !isAuthEndpoint) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res.data,
    (err: AxiosError) => Promise.reject(err.response?.data ?? err)
  );

  return client;
}

// ── Refresh token queue — handle concurrent 401s ──────────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(err: unknown, token: string | null): void {
  for (const item of pendingQueue) {
    if (err) item.reject(err);
    else item.resolve(token!);
  }
  pendingQueue = [];
}

// ── Authenticated client (with auto token refresh on 401) ─────────────────────
function createClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", // né trang cảnh báo ngrok free (vô hại với localhost)
    },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res.data,
    async (err: AxiosError) => {
      const original = err.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Only intercept 401, skip if already retried
      if (err.response?.status !== 401 || original._retry) {
        return Promise.reject(err.response?.data ?? err);
      }

      const refreshTokenValue = getRefreshToken();

      if (!refreshTokenValue) {
        handleLogout();
        return Promise.reject(err.response?.data ?? err);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<unknown>((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              original._retry = true;
              original.headers.Authorization = `Bearer ${newToken}`;
              resolve(client(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Use raw axios to avoid circular dependency with authClient
        const raw = await axios.post<ApiResponse<RefreshResponse>>(
          `${AUTH_BASE_URL}/api/auth/refresh`,
          { refreshToken: refreshTokenValue },
          { headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" } }
        );
        const newToken = raw.data.data.accessToken;
        const newRefresh = raw.data.data.refreshToken;

        // Update Redux store (rotation: lưu cả refresh token mới cho lần sau).
        // Lazy import để không tạo vòng import ở tầng module (xem readAuth ở trên).
        const [{ store }, { setToken }] = await Promise.all([
          import("~/lib/feature/store"),
          import("~/lib/feature/auth/authSlice"),
        ]);
        store.dispatch(setToken({ token: newToken, refreshToken: newRefresh }));
        original.headers.Authorization = `Bearer ${newToken}`;
        flushQueue(null, newToken);

        return client(original);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        handleLogout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return client;
}

// Auth service — port 7237 (no refresh interceptor)
export const authClient = createAuthClient(AUTH_BASE_URL);

// Module1 service — port 7167 (with refresh interceptor)
export const apiModule1Client = createClient(
  import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167",
);

export const apiModule3Client = createClient(
  import.meta.env.VITE_MODULE3_API_URL ?? "https://localhost:7215",
);

// Module2 service — port 7280 (Logistics & Tracking, with refresh interceptor)
export const apiModule2Client = createClient(
  import.meta.env.VITE_MODULE2_API_URL ?? "https://localhost:7280",
);