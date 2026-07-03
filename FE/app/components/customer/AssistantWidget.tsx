import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChatCircleDots, PaperPlaneTilt, X, MagnifyingGlass } from "~/components/shared/icons";
import { cn } from "~/lib/utils/cn";
import { getSessionKey } from "~/lib/utils/session";
import { streamAssistant, type AssistantMessage } from "~/lib/api/assistant";
import { productsApi } from "~/lib/api/products";
import { cartApi } from "~/lib/api/cart";
import { ProductCard } from "./ProductCard";
import { ChatUrlProduct } from "./ChatUrlProduct";
import { useAppSelector } from "~/lib/feature/hooks";
import { selectAuth } from "~/lib/feature/auth/authSelector";
import type { ProductListItem } from "~/lib/types/product";
import type { CartResponse } from "~/lib/types/cart";

// Một bước dùng tool (hiện đơn giản: tool gì + đầu vào gì; KHÔNG lộ output/xử lý thô).
interface ToolStep {
  id: string;
  tool: string;
  input: string;
  status: "running" | "done" | "error";
  products?: ProductListItem[];   // chỉ muaho_products: card sản phẩm
  loadingProducts?: boolean;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  steps?: ToolStep[];
  urlProduct?: string;   // nếu set: render ChatUrlProduct (resolve link + thêm giỏ inline)
}

// Bắt link sàn (taobao/1688/tmall/eBay/Rakuten) trong tin nhắn user.
function detectMarketplaceUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/i);
  if (!m) return null;
  const url = m[0];
  return /1688\.com|taobao\.com|tmall\.com|tmall\.hk|ebay\.|rakuten\.co\.jp/i.test(url) ? url : null;
}

// Tóm tắt giỏ hàng để bơm vào ngữ cảnh (bot "biết" giỏ). Không hiện trong transcript.
function buildCartSummary(cart: CartResponse | null): string {
  if (!cart || cart.totalItemCount === 0) return "trống (0 sản phẩm)";
  const items = cart.groupsByShop
    .flatMap((g) => g.items)
    .slice(0, 8)
    .map((it) => `${it.productTitle} ×${it.quantity} (¥${it.lineTotalCny})`);
  return `${cart.totalItemCount} sản phẩm, tổng tạm tính ¥${cart.subtotalCny}. Gồm: ${items.join("; ")}`;
}

// Markdown tối giản cho câu trả lời bot: **đậm**, [text](url), `code`.
// Ký tự \n giữ nguyên nhờ bubble có whitespace-pre-wrap → khỏi tự thêm <br/>.
function renderRich(text: string): ReactNode[] {
  const re = /\*\*([^*\n]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`/g;
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(<strong key={k++}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      out.push(
        <a key={k++} href={m[3]} target="_blank" rel="noreferrer" className="text-primary underline">
          {m[2]}
        </a>,
      );
    } else if (m[4] !== undefined) {
      out.push(
        <code key={k++} className="rounded bg-slate-200/70 px-1 text-[0.85em]">
          {m[4]}
        </code>,
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Rút gọn đầu vào tool cho dễ đọc (query + khoảng giá) — không hiện chi tiết nội bộ.
function summarizeInput(args: any): string {
  if (!args || typeof args !== "object") return "";
  if (args.action === "recommend") return ""; // recommend: input nội bộ, để label + card nói thay
  const p: string[] = [];
  if (args.query) p.push(`“${args.query}”`);
  if (args.expression) p.push(String(args.expression));
  if (args.max_price_cny) p.push(`≤ ${args.max_price_cny}¥`);
  if (args.min_price_cny) p.push(`≥ ${args.min_price_cny}¥`);
  return p.join(" · ");
}

// Tool muaho_products → gọi lại API sản phẩm Module1 theo action để render card thật.
async function fetchToolProducts(args: any): Promise<ProductListItem[]> {
  try {
    const action = args?.action ?? "search";
    const limit = Math.min(Math.max(Number(args?.limit) || 6, 1), 8);
    if (action === "detail") return [];
    if (action === "recommend") {
      return (await productsApi.getFeatured(limit)).data ?? [];
    }
    const res = await productsApi.search({
      keyword: args?.query || undefined,
      maxPriceCny: args?.max_price_cny ?? undefined,
      minPriceCny: args?.min_price_cny ?? undefined,
      page: 1,
      pageSize: limit,
      activeOnly: true,
    });
    return res.data?.items ?? [];
  } catch {
    return [];
  }
}

// Widget chat nổi (góc phải dưới). SSE: chữ chảy dần + hiện các bước dùng tool + card sản phẩm.
export function AssistantWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [chip, setChip] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAppSelector(selectAuth);
  const [cart, setCart] = useState<CartResponse | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, chip]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Bot "biết" giỏ: nạp giỏ khi mở widget (nếu đã đăng nhập) + sau khi thêm giỏ.
  const refreshCart = () => {
    if (!token) return;
    cartApi.getCart().then((r) => setCart(r.data ?? null)).catch(() => {});
  };
  useEffect(() => {
    if (open && token) refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  // Cập nhật assistant turn hiện tại (turn cuối).
  const patchAssistant = (fn: (turn: ChatTurn) => ChatTurn) =>
    setTurns((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") next[next.length - 1] = fn(last);
      return next;
    });

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    setInput("");

    // Link sàn → resolve + thêm giỏ NGAY trong chat (không cần gọi LLM).
    const marketUrl = detectMarketplaceUrl(text);
    if (marketUrl) {
      setTurns((prev) => [...prev, { role: "user", content: text }]);
      if (!token) {
        setTurns((prev) => [
          ...prev,
          { role: "assistant", content: t("assistant.login_to_cart", "Bạn cần đăng nhập để thêm sản phẩm vào giỏ.") },
        ]);
      } else {
        setTurns((prev) => [...prev, { role: "assistant", content: "", urlProduct: marketUrl }]);
      }
      return;
    }

    const userTurn: ChatTurn = { role: "user", content: text };
    // Bơm tóm tắt giỏ vào tin nhắn gửi lên (KHÔNG hiện ở transcript) → bot "biết" giỏ.
    const sentContent =
      token && cart
        ? `${text}\n\n(Ngữ cảnh hệ thống — giỏ hàng của tôi: ${buildCartSummary(cart)})`
        : text;
    const history: AssistantMessage[] = [
      ...turns.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: sentContent },
    ];

    setTurns((prev) => [...prev, userTurn, { role: "assistant", content: "", steps: [] }]);
    setStreaming(true);
    setChip(t("assistant.thinking"));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamAssistant(history, { sessionKey: getSessionKey(), signal: ctrl.signal }, (ev) => {
        switch (ev.type) {
          case "token":
            setChip(null);
            patchAssistant((turn) => ({
              ...turn,
              content: turn.content + (typeof ev.data === "string" ? ev.data : ev.data?.text ?? ""),
            }));
            break;

          case "thinking":
            setChip(t("assistant.thinking"));
            break;

          case "tool_call_start":
            setChip(null);
            break;

          case "tool_call": {
            setChip(null);
            const tool: string = ev.data?.tool_name ?? "tool";
            const args = ev.data?.arguments;
            const id: string = ev.data?.tool_call_id ?? `${tool}-${Date.now()}`;
            const step: ToolStep = {
              id,
              tool,
              input: summarizeInput(args),
              status: "running",
              loadingProducts: tool === "muaho_products",
            };
            patchAssistant((turn) => ({ ...turn, steps: [...(turn.steps ?? []), step] }));

            if (tool === "muaho_products") {
              fetchToolProducts(args)
                .then((products) =>
                  patchAssistant((turn) => ({
                    ...turn,
                    steps: (turn.steps ?? []).map((s) =>
                      s.id === id ? { ...s, products, loadingProducts: false } : s,
                    ),
                  })),
                )
                .catch(() =>
                  patchAssistant((turn) => ({
                    ...turn,
                    steps: (turn.steps ?? []).map((s) =>
                      s.id === id ? { ...s, loadingProducts: false } : s,
                    ),
                  })),
                );
            }
            break;
          }

          case "tool_result": {
            const id: string | undefined = ev.data?.tool_call_id;
            const isErr = !!ev.data?.is_error;
            patchAssistant((turn) => ({
              ...turn,
              steps: (turn.steps ?? []).map((s) =>
                s.id === id ? { ...s, status: isErr ? "error" : "done" } : s,
              ),
            }));
            break;
          }

          case "error":
            setError(ev.data?.message ?? t("assistant.error"));
            break;

          case "done":
            setChip(null);
            break;
        }
      });
    } catch (e) {
      if (!ctrl.signal.aborted) setError(t("assistant.error"));
    } finally {
      setStreaming(false);
      setChip(null);
      abortRef.current = null;
    }
  }

  return (
    <>
      {/* Nút nổi */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("assistant.title")}
          className={cn(
            "fixed bottom-5 right-5 z-[60] flex items-center justify-center",
            "size-14 rounded-full bg-primary text-white shadow-lg",
            "transition hover:bg-primary-dark active:scale-95",
          )}
        >
          <ChatCircleDots size={26} weight="fill" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[60] flex w-[min(92vw,26rem)] flex-col",
            "h-[min(80vh,38rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ChatCircleDots size={18} weight="fill" />
              </span>
              <div>
                <p className="font-heading text-sm font-semibold text-slate-800">{t("assistant.title")}</p>
                <p className="text-xs text-slate-400">{t("assistant.subtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="mt-6 flex flex-col items-center gap-2 text-center text-slate-400">
                <MagnifyingGlass size={28} />
                <p className="text-sm">{t("assistant.empty")}</p>
              </div>
            )}

            {turns.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-3.5 py-2 text-sm leading-relaxed text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex w-full flex-col items-start gap-2">
                  {m.steps?.map((s) => (
                    <ToolStepView key={s.id} step={s} />
                  ))}
                  {m.urlProduct && <ChatUrlProduct url={m.urlProduct} onAdded={refreshCart} />}
                  {m.content && (
                    <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-3.5 py-2 text-sm leading-relaxed text-slate-800">
                      {renderRich(m.content)}
                    </div>
                  )}
                </div>
              ),
            )}

            {chip && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-slate-300" />
                </span>
                {chip}
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* Input */}
          <form
            className="flex items-center gap-2 border-t border-slate-100 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
              className={cn(
                "flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm",
                "outline-none transition focus:border-primary focus:bg-white",
              )}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label={t("assistant.send")}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white",
                "transition hover:bg-primary-dark active:scale-95 disabled:opacity-40",
              )}
            >
              <PaperPlaneTilt size={18} weight="fill" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// Một dòng "bước dùng tool" (Claude-style, tối giản) + card sản phẩm nếu là muaho_products.
function ToolStepView({ step }: { step: ToolStep }) {
  const { t } = useTranslation();
  const label = t(`assistant.tool_${step.tool}`, step.tool);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-xs">
        <MagnifyingGlass size={13} className="shrink-0 text-slate-400" />
        <span className="font-medium text-slate-600">{label}</span>
        {step.input && <span className="min-w-0 truncate text-slate-400">{step.input}</span>}
        {step.status === "running" ? (
          <span className="ml-auto size-3 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
        ) : step.status === "error" ? (
          <span className="ml-auto shrink-0 text-red-400">!</span>
        ) : (
          <span className="ml-auto shrink-0 text-emerald-500">{"✓"}</span>
        )}
      </div>

      {step.tool === "muaho_products" &&
        (step.loadingProducts ? (
          <p className="mt-1.5 text-[11px] text-slate-400">{t("assistant.loading_products")}</p>
        ) : step.products && step.products.length > 0 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {step.products.map((p) => (
              <div key={p.id} className="w-32 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : step.status === "done" ? (
          <p className="mt-1 text-[11px] text-slate-400">{t("assistant.no_products")}</p>
        ) : null)}
    </div>
  );
}
