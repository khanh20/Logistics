import { apiModule3Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type { FrozenWalletDto } from "~/lib/types/finance";

export const adminWalletApi = {
  getFrozenWallets: () =>
    apiModule3Client.get<unknown, ApiResponse<FrozenWalletDto[]>>("/api/adminwallet/frozen"),

  unlockWallet: (id: string, reason: string) =>
    apiModule3Client.put<unknown, ApiResponse<any>>(`/api/adminwallet/${id}/unlock`, { reason }),

  toggleTrustWallet: (id: string) =>
    apiModule3Client.put<unknown, ApiResponse<any>>(`/api/adminwallet/${id}/toggle-trust`),
};
