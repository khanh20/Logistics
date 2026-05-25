import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import { useAuthStore } from "~/lib/stores/authStore";
import type { ApiResponse } from "~/lib/types/common";
import type { RefreshResponse } from "~/lib/types/auth";

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:7237";

// ── Auth client (no refresh interceptor — prevents infinite loop) ─────────────
function createAuthClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
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

      const { refreshToken, updateToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        window.location.href = "/login";
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
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );
        const newToken = raw.data.data.accessToken;

        updateToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        flushQueue(null, newToken);

        return client(original);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        logout();
        window.location.href = "/login";
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
  import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167"
);
