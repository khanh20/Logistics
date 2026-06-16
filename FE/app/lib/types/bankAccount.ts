// ═══════════════════════════════════════════════════════════════════
// Bank Account Types — DTOs cho tài khoản ngân hàng
// ═══════════════════════════════════════════════════════════════════

import type { BankAccountType, WebhookServiceEnum } from "~/lib/enums/finance";

export interface BankAccountDto {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  webhookService?: WebhookServiceEnum;
  type: BankAccountType;
  userId?: string;
  isActive: boolean;
  createdDate?: string;
}

export interface CreateBankAccountDto {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  webhookService?: WebhookServiceEnum;
}
