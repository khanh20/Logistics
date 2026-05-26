// ═══════════════════════════════════════════════════════════════════
// Bank Account API — CRUD + toggle status
// ═══════════════════════════════════════════════════════════════════

import { apiModule3Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type { BankAccountDto, CreateBankAccountDto } from "~/lib/types/bankAccount";

export const bankAccountApi = {
  create: (data: CreateBankAccountDto) =>
    apiModule3Client.post<unknown, ApiResponse<BankAccountDto>>("/api/bank-accounts", data),

  getById: (id: string) =>
    apiModule3Client.get<unknown, ApiResponse<BankAccountDto>>(`/api/bank-accounts/${id}`),

  getSystemBankAccounts: () =>
    apiModule3Client.get<unknown, ApiResponse<BankAccountDto[]>>("/api/bank-accounts/system"),

  getMyBankAccounts: () =>
    apiModule3Client.get<unknown, ApiResponse<BankAccountDto[]>>("/api/bank-accounts/my"),

  toggleStatus: (id: string) =>
    apiModule3Client.patch<unknown, ApiResponse<string>>(`/api/bank-accounts/${id}/toggle-status`),

  delete: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<string>>(`/api/bank-accounts/${id}`),
};
