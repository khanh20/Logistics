export interface Platform {
  id: string;
  name: string;
  baseUrl: string;
  apiProvider: string;
  isActive: boolean;
  logoUrl: string | null;
  shopCount: number;
  accountCount: number;
}

export interface PlatformSlim {
  id: string;
  name: string;
  apiProvider: string;
  isActive: boolean;
  logoUrl: string | null;
}

export interface PlatformShop {
  id: string;
  platformId: string;
  platformName: string;
  shopIdOnPlatform: string;
  shopName: string;
  shopUrl: string | null;
  internalRating: number;
  totalProductsCrawled: number;
  avgShipDays: number | null;
  disputeRate: number;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  createdAt: string;
}

export interface PlatformAccount {
  id: string;
  platformId: string;
  platformName: string;
  username: string;
  alipayBalance: number;
  dailySpendLimit: number;
  dailySpentToday: number;
  remainingTodayCapacity: number;
  isFrozen: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface CreatePlatformRequest {
  name: string;
  baseUrl: string;
  apiProvider: string;
  logoUrl?: string;
}

export interface UpdatePlatformRequest {
  name: string;
  baseUrl: string;
  apiProvider: string;
  isActive: boolean;
  logoUrl?: string;
}

export interface SetCredentialsRequest {
  apiKey: string;
  apiSecret?: string;
}
