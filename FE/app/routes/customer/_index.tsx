import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useEffect, useRef } from "react";
import type { Route } from "./+types/_index";
import { productsApi } from "~/lib/api/products";
import { exchangeRatesApi } from "~/lib/api/categories";
import { ProductCard } from "~/components/customer/ProductCard";
import { formatVND } from "~/lib/utils/format";
import type { ProductListItem } from "~/lib/types/product";
import type { ExchangeRate } from "~/lib/types/category";

import {
  PiPackageBold,
  PiGlobeBold,
  PiShieldCheckBold,
  PiArrowRightBold,
  PiTrendUpBold,
} from "react-icons/pi";
import { SiTaobao, SiAliexpress, SiEbay, SiRakuten } from "react-icons/si";

/* ── Scroll Reveal Hook (IntersectionObserver, never window.scroll) ── */
function useScrollReveal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll(".reveal-hidden");
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return containerRef;
}

/* ── Meta ── */
export function meta(_: Route.MetaArgs) {
  return [
    { title: "MuaHo Logistics - Mua ho hang nuoc ngoai" },
    {
      name: "description",
      content:
        "Dich vu mua ho hang Taobao, 1688, AliExpress, eBay, Rakuten ve Viet Nam. Ti gia minh bach, giao hang tan noi.",
    },
  ];
}

/* ── Loader ── */
export async function clientLoader() {
  const [featuredRes, rateRes] = await Promise.all([
    productsApi.getFeatured(12),
    exchangeRatesApi.getCurrent().catch(() => null),
  ]);
  return {
    featured: featuredRes.data,
    rate: rateRes?.data ?? null,
  };
}

/* ── Page ── */
export default function CustomerHomePage({
  loaderData,
}: {
  loaderData: { featured: ProductListItem[]; rate: ExchangeRate | null };
}) {
  const { t } = useTranslation();
  const { featured, rate } = loaderData;
  const scrollRef = useScrollReveal();

  return (
    <div
      ref={scrollRef}
      className="min-h-screen"
      style={{ backgroundColor: "var(--mu-canvas)" }}
    >
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        {/* ────────────────────────────────────────────
            SECTION 1: HERO — Editorial Offset
        ──────────────────────────────────────────── */}
        <section className="pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <h1
                className="reveal-hidden font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-[-0.03em] mb-6"
                style={{ color: "var(--mu-text)" }}
              >
                {t("home.hero_title")}{" "}
                <span className="text-primary italic">
                  {t("home.hero_highlight")}
                </span>
              </h1>

              <p
                className="reveal-hidden text-lg leading-[1.6] mb-10 max-w-[42ch]"
                style={{ color: "var(--mu-text-secondary)", transitionDelay: "100ms" }}
              >
                {t("home.hero_subtitle")}
              </p>

              <div className="reveal-hidden flex flex-col sm:flex-row gap-4 items-start" style={{ transitionDelay: "200ms" }}>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium transition-colors active:scale-[0.98]"
                  style={{
                    backgroundColor: "var(--mu-cta-bg)",
                    color: "var(--mu-cta-text)",
                    borderRadius: "6px",
                  }}
                >
                  {t("home.cta_browse")}
                  <PiArrowRightBold className="text-base" />
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-3 text-sm font-medium transition-colors active:scale-[0.98]"
                  style={{
                    color: "var(--mu-text)",
                    border: "1px solid var(--mu-border)",
                    borderRadius: "6px",
                    backgroundColor: "var(--mu-surface)",
                  }}
                >
                  {t("home.cta_register")}
                </Link>
              </div>

              {/* Exchange rate indicator */}
              {rate && (
                <div
                  className="reveal-hidden mt-10 inline-flex items-center gap-3 px-4 py-2.5 text-sm font-mono"
                  style={{
                    border: "1px solid var(--mu-border)",
                    borderRadius: "8px",
                    backgroundColor: "var(--mu-surface)",
                    transitionDelay: "300ms",
                  }}
                >
                  <PiTrendUpBold
                    className="text-base"
                    style={{ color: "var(--mu-pastel-green-text)" }}
                  />
                  <span style={{ color: "var(--mu-text-secondary)" }}>
                    {t("home.rate_today")}
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--mu-text)" }}
                  >
                    1 ¥ = {formatVND(rate.rateVndPerCny)}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Warm desaturated photograph */}
            <div
              className="reveal-hidden relative aspect-[4/3] w-full overflow-hidden"
              style={{
                borderRadius: "12px",
                border: "1px solid var(--mu-border)",
                transitionDelay: "150ms",
              }}
            >
              <img
                src="https://picsum.photos/seed/muaho-shipping-packages/960/720"
                alt="Cross-border shipping packages ready for delivery"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "saturate(0.75) contrast(0.95)" }}
                loading="eager"
              />
              {/* Warm grain overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 30% 40%, rgba(247,246,243,0.15), transparent 70%)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────
            SECTION 2: FEATURES — Asymmetric Bento Grid
        ──────────────────────────────────────────── */}
        <section className="py-24 lg:py-32">
          <h2
            className="reveal-hidden font-serif text-3xl lg:text-4xl font-bold tracking-[-0.02em] leading-[1.1] mb-16"
            style={{ color: "var(--mu-text)" }}
          >
            {t("home.feature_1_title") !== "home.feature_1_title"
              ? "Dịch vụ của chúng tôi"
              : "Dịch vụ của chúng tôi"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Wide span (2 cols) — Global sourcing */}
            <div
              className="reveal-hidden md:col-span-2 p-8 lg:p-10 flex flex-col justify-between transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              style={{
                backgroundColor: "var(--mu-surface)",
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "100ms",
              }}
            >
              <div className="mb-10">
                <div
                  className="w-11 h-11 flex items-center justify-center mb-6"
                  style={{
                    backgroundColor: "var(--mu-pastel-blue-bg)",
                    borderRadius: "8px",
                  }}
                >
                  <PiGlobeBold
                    className="text-xl"
                    style={{ color: "var(--mu-pastel-blue-text)" }}
                  />
                </div>
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ color: "var(--mu-text)" }}
                >
                  {t("home.feature_1_title")}
                </h3>
                <p
                  className="leading-[1.6] max-w-[48ch]"
                  style={{ color: "var(--mu-text-secondary)" }}
                >
                  {t("home.feature_1_desc")}
                </p>
              </div>
              {/* Visual element: warm-toned image strip */}
              <div
                className="h-28 w-full overflow-hidden"
                style={{
                  borderRadius: "8px",
                  border: "1px solid var(--mu-border)",
                }}
              >
                <img
                  src="https://picsum.photos/seed/muaho-global-logistics/800/200"
                  alt="Global logistics network"
                  className="w-full h-full object-cover"
                  style={{ filter: "saturate(0.7) contrast(0.95)" }}
                  loading="lazy"
                />
              </div>
            </div>

            {/* Card 2: Single col — Transparent pricing */}
            <div
              className="reveal-hidden p-8 flex flex-col transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              style={{
                backgroundColor: "var(--mu-surface)",
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "200ms",
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center mb-6"
                style={{
                  backgroundColor: "var(--mu-pastel-green-bg)",
                  borderRadius: "8px",
                }}
              >
                <PiShieldCheckBold
                  className="text-xl"
                  style={{ color: "var(--mu-pastel-green-text)" }}
                />
              </div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ color: "var(--mu-text)" }}
              >
                {t("home.feature_2_title")}
              </h3>
              <p
                className="leading-[1.6]"
                style={{ color: "var(--mu-text-secondary)" }}
              >
                {t("home.feature_2_desc")}
              </p>
            </div>

            {/* Card 3: Single col — Fast delivery */}
            <div
              className="reveal-hidden p-8 flex flex-col transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              style={{
                backgroundColor: "var(--mu-surface)",
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "300ms",
              }}
            >
              <div
                className="w-11 h-11 flex items-center justify-center mb-6"
                style={{
                  backgroundColor: "var(--mu-pastel-yellow-bg)",
                  borderRadius: "8px",
                }}
              >
                <PiPackageBold
                  className="text-xl"
                  style={{ color: "var(--mu-pastel-yellow-text)" }}
                />
              </div>
              <h3
                className="text-xl font-semibold mb-3"
                style={{ color: "var(--mu-text)" }}
              >
                {t("home.feature_3_title")}
              </h3>
              <p
                className="leading-[1.6]"
                style={{ color: "var(--mu-text-secondary)" }}
              >
                {t("home.feature_3_desc")}
              </p>
            </div>

            {/* Card 4: Wide span — trust / statistics */}
            <div
              className="reveal-hidden md:col-span-2 p-8 lg:p-10 flex items-center gap-10 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              style={{
                backgroundColor: "var(--mu-surface-alt)",
                border: "1px solid var(--mu-border)",
                borderRadius: "12px",
                transitionDelay: "400ms",
              }}
            >
              <div className="flex gap-12 lg:gap-16">
                <div>
                  <p
                    className="font-serif text-4xl font-bold tracking-[-0.02em]"
                    style={{ color: "var(--mu-text)" }}
                  >
                    5,200+
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--mu-text-secondary)" }}
                  >
                    Don hang hoan thanh
                  </p>
                </div>
                <div
                  className="w-px self-stretch"
                  style={{ backgroundColor: "var(--mu-border)" }}
                />
                <div>
                  <p
                    className="font-serif text-4xl font-bold tracking-[-0.02em]"
                    style={{ color: "var(--mu-text)" }}
                  >
                    12 ngay
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--mu-text-secondary)" }}
                  >
                    Giao hang trung binh
                  </p>
                </div>
                <div
                  className="w-px self-stretch hidden sm:block"
                  style={{ backgroundColor: "var(--mu-border)" }}
                />
                <div className="hidden sm:block">
                  <p
                    className="font-serif text-4xl font-bold tracking-[-0.02em]"
                    style={{ color: "var(--mu-text)" }}
                  >
                    98.7%
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--mu-text-secondary)" }}
                  >
                    Khach hang hai long
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────
            SECTION 3: FEATURED PRODUCTS
        ──────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section className="py-24 lg:py-32">
            <div
              className="w-full mb-16"
              style={{
                borderTop: "1px solid var(--mu-border)",
                paddingTop: "2rem",
              }}
            >
              <div className="reveal-hidden flex items-end justify-between">
                <h2
                  className="font-serif text-3xl font-bold tracking-[-0.02em]"
                  style={{ color: "var(--mu-text)" }}
                >
                  {t("product.featured")}
                </h2>
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: "var(--mu-text-secondary)" }}
                >
                  {t("home.see_all")}
                  <PiArrowRightBold className="text-xs" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-5">
              {featured.map((p, index) => (
                <div
                  key={p.id}
                  className="reveal-hidden"
                  style={{
                    transitionDelay: `${index * 80}ms`,
                  }}
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ────────────────────────────────────────────
            SECTION 4: SUPPORTED PLATFORMS — Logo Wall
        ──────────────────────────────────────────── */}
        <section className="py-24 lg:py-32">
          <div
            className="w-full"
            style={{ borderTop: "1px solid var(--mu-border)" }}
          >
            <p
              className="reveal-hidden text-center text-xs font-semibold uppercase tracking-[0.1em] mt-16 mb-14"
              style={{ color: "var(--mu-text-secondary)" }}
            >
              {t("home.supported_by")}
            </p>

            <div className="flex flex-wrap justify-center items-center gap-14 sm:gap-20">
              <div
                className="reveal-hidden flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                style={{ transitionDelay: "100ms" }}
              >
                <SiTaobao className="text-3xl" style={{ color: "#FF5000" }} />
                <span
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: "var(--mu-text)" }}
                >
                  Taobao
                </span>
              </div>

              <div
                className="reveal-hidden flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                style={{ transitionDelay: "200ms" }}
              >
                <span
                  className="text-2xl font-black tracking-tighter"
                  style={{ color: "#FF6A00" }}
                >
                  1688
                </span>
              </div>

              <div
                className="reveal-hidden flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                style={{ transitionDelay: "300ms" }}
              >
                <SiAliexpress
                  className="text-3xl"
                  style={{ color: "#FF4747" }}
                />
                <span
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: "var(--mu-text)" }}
                >
                  AliExpress
                </span>
              </div>

              <div
                className="reveal-hidden flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                style={{ transitionDelay: "400ms" }}
              >
                <SiEbay className="text-4xl" style={{ color: "#E53238" }} />
              </div>

              <div
                className="reveal-hidden flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity duration-300"
                style={{ transitionDelay: "500ms" }}
              >
                <SiRakuten
                  className="text-3xl"
                  style={{ color: "#BF0000" }}
                />
                <span
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: "var(--mu-text)" }}
                >
                  Rakuten
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
