import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { VariantPicker } from "./VariantPicker";
import { ingestionApi, exchangeRatesApi } from "~/lib/api/categories";
import { cartApi } from "~/lib/api/cart";
import { pingExtension, scrapeViaExtension } from "~/lib/extension/bridge";
import { toScrapedPayload } from "~/lib/types/category";
import { useAuthStore } from "~/lib/stores/authStore";
import type { ProductDetail } from "~/lib/types/product";

// Sàn TQ cần extension scrape (không có API backend).
function detectPlatform(url: string): "CN" | "API" | null {
  if (/1688\.com|taobao\.com|tmall\.com|tmall\.hk/i.test(url)) return "CN";
  if (/ebay\.|rakuten\.co\.jp/i.test(url)) return "API";
  return null;
}

type Step = "input" | "loading" | "need_ext" | "picker";

interface UrlOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export function UrlOrderModal({ open, onClose }: UrlOrderModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuthStore.getState();

  const [url, setUrl] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [rate, setRate] = useState<number | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function reset() {
    setUrl("");
    setStep("input");
    setError(null);
    setProduct(null);
    setCartMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Tải tỉ giá để VariantPicker hiện giá VNĐ (không chặn flow nếu lỗi).
  async function loadRate() {
    try {
      const res = await exchangeRatesApi.getCurrent();
      setRate(res.data?.rateVndPerCny);
    } catch {
      /* ignore */
    }
  }

  async function handleResolve() {
    setError(null);
    setCartMsg(null);

    if (!token) {
      navigate("/login");
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      setError(t("url_order.err_empty"));
      return;
    }
    const kind = detectPlatform(trimmed);
    if (!kind) {
      setError(t("url_order.err_unsupported"));
      return;
    }

    setStep("loading");
    loadRate();

    try {
      if (kind === "CN") {
        // Sàn TQ → cần extension scrape.
        const hasExt = await pingExtension();
        if (!hasExt) {
          setStep("need_ext");
          return;
        }
        const scraped = await scrapeViaExtension(trimmed);
        const res = await ingestionApi.resolveUrl({
          url: trimmed,
          scrapedData: toScrapedPayload(scraped),
        });
        handleResolveResponse(res.data);
      } else {
        // eBay/Rakuten → backend tự resolve.
        const res = await ingestionApi.resolveUrl({ url: trimmed });
        handleResolveResponse(res.data);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      if (msg === "TIMEOUT" || msg === "timeout") setError(t("url_order.err_timeout"));
      else if (msg === "NO_EXTENSION") setStep("need_ext");
      else setError((err as { message?: string })?.message ?? t("url_order.err_generic"));
      if (msg !== "NO_EXTENSION") setStep("input");
    }
  }

  function handleResolveResponse(data: {
    status: string;
    reason: string | null;
    product: ProductDetail | null;
  }) {
    if (data.status === "NeedExtension") {
      setStep("need_ext");
      return;
    }
    if (data.status === "Forbidden") {
      setError(t("url_order.err_forbidden", { reason: data.reason ?? "" }));
      setStep("input");
      return;
    }
    if (data.status !== "Resolved" || !data.product) {
      setError(data.reason ?? t("url_order.err_generic"));
      setStep("input");
      return;
    }
    setProduct(data.product);
    setStep("picker");
  }

  async function handleAddToCart(variantId: string, quantity: number) {
    if (!product) return;
    setAdding(true);
    setCartMsg(null);
    try {
      await cartApi.addItem({ productId: product.id, variantId, quantity });
      setCartMsg({ type: "success", text: t("url_order.added") });
    } catch (err: unknown) {
      setCartMsg({
        type: "error",
        text: (err as { message?: string })?.message ?? t("product.cart_error"),
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("url_order.title")} maxWidth="lg">
      {/* Bước nhập URL */}
      {(step === "input" || step === "loading") && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t("url_order.subtitle")}</p>
          <Input
            label={t("url_order.url_label")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://detail.1688.com/offer/..."
            disabled={step === "loading"}
          />
          {error && (
            <p className="text-sm rounded-lg px-4 py-2 bg-red-50 text-red-600 border border-red-200">
              {error}
            </p>
          )}
          <Button className="w-full" size="lg" loading={step === "loading"} onClick={handleResolve}>
            {step === "loading" ? t("url_order.resolving") : t("url_order.resolve")}
          </Button>
          {step === "loading" && (
            <p className="text-xs text-gray-400 text-center">{t("url_order.loading_hint")}</p>
          )}
        </div>
      )}

      {/* Cần cài extension */}
      {step === "need_ext" && (
        <div className="space-y-4 text-center py-4">
          <div className="text-4xl">🧩</div>
          <h3 className="font-semibold text-gray-900">{t("url_order.need_ext_title")}</h3>
          <p className="text-sm text-gray-600">{t("url_order.need_ext_desc")}</p>
          <div className="flex flex-col gap-2">
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-base font-medium text-white hover:bg-primary-dark"
            >
              {t("url_order.install_ext")}
            </a>
            <Button variant="secondary" onClick={() => setStep("input")}>
              {t("url_order.back")}
            </Button>
          </div>
        </div>
      )}

      {/* Popup chọn variant */}
      {step === "picker" && product && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <img
              src={
                product.images.find((i) => i.isPrimary)?.url ??
                product.images[0]?.url ??
                ""
              }
              alt=""
              className="w-24 h-24 rounded-lg object-cover border border-gray-200 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 line-clamp-3">
                {product.translatedTitle ?? product.originalTitle}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {product.shop.platformName} · {product.shop.shopName}
              </p>
            </div>
          </div>

          <VariantPicker
            product={product}
            rateVndPerCny={rate}
            adding={adding}
            message={cartMsg}
            onAddToCart={handleAddToCart}
          />

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" className="flex-1" onClick={() => navigate("/cart")}>
              {t("url_order.go_cart")}
            </Button>
            <Button variant="ghost" className="flex-1" onClick={reset}>
              {t("url_order.add_another")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
