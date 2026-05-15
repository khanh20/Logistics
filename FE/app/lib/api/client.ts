import axios from "axios";
import { useAuthStore } from "~/lib/stores/authStore";

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
    async (err) => {
      if (err.response?.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
      return Promise.reject(err.response?.data ?? err);
    },
  );

  return client;
}

// Auth service — port 7237
export const authClient = createClient(
  import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:7237",
);

// Module1 service — port 7167
export const apiModule1Client = createClient(
  import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167",
);
