import { apiModule1Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  Platform,
  PlatformSlim,
  PlatformShop,
  PlatformAccount,
  CreatePlatformRequest,
  UpdatePlatformRequest,
  SetCredentialsRequest,
} from "~/lib/types/platform";

export const platformsApi = {
  getAll: () =>
    apiModule1Client.get<unknown, ApiResponse<Platform[]>>("/api/platforms"),

  getAllActive: () =>
    apiModule1Client.get<unknown, ApiResponse<PlatformSlim[]>>("/api/platforms/active"),

  getById: (id: string) =>
    apiModule1Client.get<unknown, ApiResponse<Platform>>(`/api/platforms/${id}`),

  create: (body: CreatePlatformRequest) =>
    apiModule1Client.post<unknown, ApiResponse<Platform>>("/api/platforms", body),

  update: (id: string, body: UpdatePlatformRequest) =>
    apiModule1Client.put<unknown, ApiResponse<Platform>>(`/api/platforms/${id}`, body),

  setCredentials: (id: string, body: SetCredentialsRequest) =>
    apiModule1Client.put<unknown, ApiResponse<null>>(`/api/platforms/${id}/credentials`, body),

  // Shops
  getShops: (platformId: string) =>
    apiModule1Client.get<unknown, ApiResponse<PlatformShop[]>>(
      `/api/platforms/${platformId}/shops`
    ),

  blacklistShop: (platformId: string, shopId: string, reason: string) =>
    apiModule1Client.post<unknown, ApiResponse<null>>(
      `/api/platforms/${platformId}/shops/${shopId}/blacklist`,
      { reason }
    ),

  unblacklistShop: (platformId: string, shopId: string) =>
    apiModule1Client.delete<unknown, ApiResponse<null>>(
      `/api/platforms/${platformId}/shops/${shopId}/blacklist`
    ),

  // Accounts
  getAccounts: (platformId: string) =>
    apiModule1Client.get<unknown, ApiResponse<PlatformAccount[]>>(
      `/api/platforms/${platformId}/accounts`
    ),
};
