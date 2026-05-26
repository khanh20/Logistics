// ═══════════════════════════════════════════════════════════════════
// Customer Profile API — Profile, Address, KYC
// ═══════════════════════════════════════════════════════════════════

import { apiModule3Client } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  CustomerProfileDto,
  CreateCustomerProfileDto,
  UpdateCustomerProfileDto,
  CustomerAddressDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  CustomerKycDto,
  UpdateKycFromOcrRequest,
  ScanCccdResponse,
} from "~/lib/types/customerProfile";

export const customerProfileApi = {
  // ── Profile ──────────────────────────────────────────────────
  getMyProfile: () =>
    apiModule3Client.get<unknown, ApiResponse<CustomerProfileDto>>("/api/CustomerProfile/me"),

  createMyProfile: (data: CreateCustomerProfileDto) =>
    apiModule3Client.post<unknown, ApiResponse<CustomerProfileDto>>("/api/CustomerProfile/me", data),

  updateProfile: (id: string, data: UpdateCustomerProfileDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/CustomerProfile/${id}`, data),

  // ── Address ──────────────────────────────────────────────────
  getMyAddresses: () =>
    apiModule3Client.get<unknown, ApiResponse<CustomerAddressDto[]>>("/api/CustomerAddress/me"),

  createAddress: (data: CreateCustomerAddressDto) =>
    apiModule3Client.post<unknown, ApiResponse<CustomerAddressDto>>("/api/CustomerAddress", data),

  updateAddress: (id: string, data: UpdateCustomerAddressDto) =>
    apiModule3Client.put<unknown, ApiResponse<void>>(`/api/CustomerAddress/${id}`, data),

  deleteAddress: (id: string) =>
    apiModule3Client.delete<unknown, ApiResponse<void>>(`/api/CustomerAddress/${id}`),

  setDefaultAddress: (id: string) =>
    apiModule3Client.patch<unknown, ApiResponse<void>>(`/api/CustomerAddress/${id}/set-default`),

  // ── KYC ──────────────────────────────────────────────────────
  getKyc: () =>
    apiModule3Client.get<unknown, ApiResponse<CustomerKycDto>>("/api/kyc"),

  scanCccd: (frontImage: File, backImage?: File) => {
    const formData = new FormData();
    formData.append("frontImage", frontImage);
    if (backImage) formData.append("backImage", backImage);
    return apiModule3Client.post<unknown, ApiResponse<ScanCccdResponse>>("/api/kyc/scan-cccd", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  submitKyc: (data: UpdateKycFromOcrRequest) =>
    apiModule3Client.post<unknown, ApiResponse<CustomerKycDto>>("/api/kyc/submit", data),
};
