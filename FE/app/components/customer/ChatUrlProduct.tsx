import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { VariantPicker } from "./VariantPicker";
import { ingestionApi, exchangeRatesApi } from "~/lib/api/categories";
import { cartApi } from "~/lib/api/cart";
import { pingExtension, scrapeViaExtension } from "~/lib/extension/bridge";
import { toScrapedPayload } from "~/lib/types/category";
import type { ProductDetail } from "~/lib/types/product";

// Sàn TQ cần extension scrape; eBay/Rakuten backend tự resolve (giống UrlOrderModal).
function detectPlatform(url: string): "CN" | "API" | null {
  if (/1688\.com|taobao\.com|tmall\.com|tmall\.hk/i.test(url)) return "CN";
  if (/ebay\.|rakuten\.co\.jp/i.test(url)) return "API";
  return null;
}

type Step = "loading" | "need_ext" | "error" | "picker";

// Resolve 1 link sàn + cho phép thêm giỏ NGAY trong khung chat.
// Tái dùng đúng luồng của UrlOrderModal (resolve → VariantPicker → cartApi.addItem),
// chỉ khác: hiển thị gọn inline và báo cho widget refresh giỏ qua onAdded.
export function ChatUrlProduct({ url, onAdded }: { url: string; onAdded?: () => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [rate, setRate] = useState<number | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // resolve đúng 1 lần
    ran.current = true;
    void resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolve() {
    exchangeRatesApi.getCurrent().then((r) => setRate(r.data?.rateVndPerCny)).catch(() => {});
    const kind = detectPlatform(url);
    try {
      if (kind === "CN") {
        const hasExt = await pingExtension();
        if (!hasExt) return setStep("need_ext");
        const scraped = await scrapeViaExtension(url);
        const res = await ingestionApi.resolveUrl({ url, scrapedData: toScrapedPayload(scraped) });
        handleResp(res.data);
      } else if (kind === "API") {
        const res = await ingestionApi.resolveUrl({ url });
        handleResp(res.data);
      } else {
        setErrMsg(t("url_order.err_unsupported"));
        setStep("error");
      }
    } catch (e: unknown) {
      if ((e as Error)?.message === "NO_EXTENSION") return setStep("need_ext");
      setErrMsg((e as { message?: string })?.message ?? t("url_order.err_generic"));
      setStep("error");
    }
  }

  function handleResp(data: { status: string; reason: string | null; product: ProductDetail | null }) {
    if (data.status === "NeedExtension") return setStep("need_ext");
    if (data.status === "Forbidden") {
      setErrMsg(t("url_order.err_forbidden", { reason: data.reason ?? "" }));
      return setStep("error");
    }
    if (data.status !== "Resolved" || !data.product) {
      setErrMsg(data.reason ?? t("url_order.err_generic"));
      return setStep("error");
    }
    setProduct(data.product);
    setStep("picker");
  }

  async function handleAdd(variantId: string, quantity: number) {
    if (!product) return;
    setAdding(true);
    setCartMsg(null);
    try {
      await cartApi.addItem({ productId: product.id, variantId, quantity });
      setCartMsg({ type: "success", text: t("url_order.added") });
      onAdded?.();
    } catch (e: unknown) {
      setCartMsg({ type: "error", text: (e as { message?: string })?.message ?? t("product.cart_error") });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm">
      {step === "loading" && (
        <p className="flex items-center gap-2 text-slate-500">
          <span className="size-3 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
          {t("assistant.url_checking", "Đang kiểm tra sản phẩm từ link…")}
        </p>
      )}
      {step === "need_ext" && <p className="text-slate-600">🧩 {t("url_order.need_ext_desc")}</p>}
      {step === "error" && <p className="text-red-500">{errMsg}</p>}
      {step === "picker" && product && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <img
              src={product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? ""}
              alt=""
              className="size-14 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-medium text-slate-800">
                {product.translatedTitle ?? product.originalTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {product.shop.platformName} · {product.shop.shopName}
              </p>
            </div>
          </div>
          <VariantPicker
            product={product}
            rateVndPerCny={rate}
            adding={adding}
            message={cartMsg}
            onAddToCart={handleAdd}
          />
        </div>
      )}
    </div>
  );
}
