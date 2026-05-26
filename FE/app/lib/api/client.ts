import axios from "axios";

function getAuthFromStorage() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("muaho-auth");
    if (saved) return JSON.parse(saved);
  } catch (e) {
    return null;
  }
  return null;
}

function createClient(baseURL: string) {
  const client = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const auth = getAuthFromStorage();
    const token = auth?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res.data,
    async (err) => {
      if (err.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("muaho-auth");
          window.location.href = "/login";
        }
      }
      return Promise.reject(err.response?.data ?? err);
    },
  );

  return client;
}

export const authClient = createClient(
  import.meta.env.VITE_AUTH_API_URL ?? "https://localhost:7237",
);

export const apiModule1Client = createClient(
  import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167",
);

export const apiModule3Client = createClient(
  import.meta.env.VITE_MODULE3_API_URL ?? "https://localhost:7215",
);