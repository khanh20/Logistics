// Cầu nối web MuaHo ↔ Chrome Extension (externally_connectable).
// Web dán URL sàn TQ → nhờ extension mở tab ẩn scrape → nhận lại data.
//
// Extension ID cố định (suy từ manifest "key"). Override qua VITE_EXTENSION_ID nếu cần.
const EXT_ID =
  (import.meta.env.VITE_EXTENSION_ID as string | undefined) ??
  "nlpcnaigmokbpldhhhedfhfefmblhijk";

// Shape data extension scrape trả về (khớp adapter.scrape() trong extension).
export interface ScrapedData {
  platform: string;
  platformProductId: string;
  shopIdOnPlatform: string;
  shopName: string;
  shopUrl: string | null;
  titleOriginal: string;
  titleTranslated: string | null;
  priceOriginal: number;
  pricePromotion: number | null;
  currency: string;
  stock: number | null;
  primaryImageUrl: string | null;
  imageUrls: string[];
  propertiesOriginal: string | null;
  propertiesTranslated: string | null;
  selectedSkuId: string;
  priceTiers: { minQuantity: number; maxQuantity: number | null; priceOriginal: number }[];
  confidence: string;
}

interface ChromeRuntime {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void;
  lastError?: { message?: string };
}

function getRuntime(): ChromeRuntime | null {
  const c = (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome;
  return c?.runtime ?? null;
}

// Gửi 1 message tới extension, bọc timeout. Reject nếu không có extension / quá hạn.
function send<T>(message: unknown, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const rt = getRuntime();
    if (!rt || typeof rt.sendMessage !== "function") {
      reject(new Error("NO_EXTENSION"));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    try {
      rt.sendMessage(EXT_ID, message, (resp: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        // lastError xuất hiện khi extension không cài / không nhận.
        if (rt.lastError) {
          reject(new Error("NO_EXTENSION"));
          return;
        }
        resolve(resp as T);
      });
    } catch {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error("NO_EXTENSION"));
      }
    }
  });
}

// Kiểm tra extension MuaHo có cài + bật không.
export async function pingExtension(): Promise<boolean> {
  try {
    const resp = await send<{ ok?: boolean }>({ action: "ping" }, 1500);
    return !!resp?.ok;
  } catch {
    return false;
  }
}

// Nhờ extension scrape 1 URL sàn. Trả ScrapedData hoặc throw lý do.
export async function scrapeViaExtension(url: string): Promise<ScrapedData> {
  // Timeout 16s (> 15s timeout phía background) để background kịp trả lý do timeout.
  const resp = await send<{ ok: boolean; data?: ScrapedData; reason?: string }>(
    { action: "scrapeUrl", url },
    16000
  );
  if (resp?.ok && resp.data) return resp.data;
  throw new Error(resp?.reason ?? "SCRAPE_FAILED");
}
