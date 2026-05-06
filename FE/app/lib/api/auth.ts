import { authClient } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type { AuthResponse, LoginRequest, RefreshResponse, RegisterRequest } from "~/lib/types/auth";

export const authApi = {
  login: (body: LoginRequest) =>
    authClient.post<unknown, ApiResponse<AuthResponse>>("/api/auth/login", body),

  register: (body: RegisterRequest) =>
    authClient.post<unknown, ApiResponse<AuthResponse>>("/api/auth/register", body),

  refresh: (refreshToken: string) =>
    authClient.post<unknown, ApiResponse<RefreshResponse>>("/api/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    authClient.post<unknown, ApiResponse<null>>("/api/auth/logout", { refreshToken }),
};
