// ═══════════════════════════════════════════════════════════════════
// Customer Profile Types — Profile, Address, KYC DTOs
// ═══════════════════════════════════════════════════════════════════

import type { Gender, PreferredChannel } from "~/lib/enums/finance";

// ── Customer Profile ─────────────────────────────────────────────
export interface CustomerProfileDto {
  id: string;
  userId: string;
  customerCode: string;
  vipTierId?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredChannel: PreferredChannel;
  zaloUserId?: string;
  referralCode?: string;
  lifetimeValueVnd: number;
  totalOrders: number;
  createdDate?: string;
}

export interface CreateCustomerProfileDto {
  customerCode: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredChannel?: PreferredChannel;
  zaloUserId?: string;
}

export interface UpdateCustomerProfileDto {
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  preferredChannel?: PreferredChannel;
  zaloUserId?: string;
}

// ── Customer Address ─────────────────────────────────────────────
export interface CustomerAddressDto {
  id: string;
  customerId: string;
  label?: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  wardCode?: string;
  districtCode?: string;
  provinceCode?: string;
  isDefault: boolean;
  isActive: boolean;
  createdDate?: string;
}

export interface CreateCustomerAddressDto {
  label?: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  wardCode?: string;
  districtCode?: string;
  provinceCode?: string;
  isDefault?: boolean;
}

export interface UpdateCustomerAddressDto {
  label?: string;
  recipientName?: string;
  phone?: string;
  addressLine?: string;
  wardCode?: string;
  districtCode?: string;
  provinceCode?: string;
  isDefault?: boolean;
}

// ── Customer KYC ─────────────────────────────────────────────────
export interface CustomerKycDto {
  id: string;
  customerId: string;
  idNumber?: string;
  fullNameOnId?: string;
  dateOfBirthOnId?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
  status?: string;
  kycLevel?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  kycExpiresAt?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface UpdateKycFromOcrRequest {
  idNumber?: string;
  fullNameOnId?: string;
  dateOfBirthOnId?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
}

export interface ScanCccdResponse {
  customerId: string;
  idNumber?: string;
  fullNameOnId?: string;
  dateOfBirthOnId?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  expiryDate?: string;
  rawText?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  message?: string;
}
