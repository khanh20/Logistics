export const PLATFORMS = ["Taobao", "1688", "AliExpress", "eBay", "Rakuten"] as const;
export type PlatformName = (typeof PLATFORMS)[number];

export const API_PROVIDERS = ["Apify", "PublicApi", "Manual"] as const;
export type ApiProvider = (typeof API_PROVIDERS)[number];

export const PLATFORM_ICON: Record<string, string> = {
  Taobao:     "🛒",
  "1688":     "🏭",
  AliExpress: "🌍",
  eBay:       "🔵",
  Rakuten:    "🇯🇵",
};
