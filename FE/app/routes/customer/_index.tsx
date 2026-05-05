import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Route } from "./+types/_index";
import { productsApi } from "~/lib/api/products";
import { exchangeRatesApi } from "~/lib/api/categories";
import { ProductCard } from "~/components/customer/ProductCard";
import { formatVND } from "~/lib/utils/format";
import type { ProductListItem } from "~/lib/types/product";
import type { ExchangeRate } from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "MuaHo Logistics — Mua hộ hàng nước ngoài" },
    {
      name: "description",
      content: "Mua hộ hàng Taobao, 1688, AliExpress, eBay, Rakuten về Việt Nam",
    },
  ];
}

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

export default function CustomerHomePage({
  loaderData,
}: {
  loaderData: { featured: ProductListItem[]; rate: ExchangeRate | null };
}) {
  const { t } = useTranslation();
  const { featured, rate } = loaderData;

  const FEATURES = [
    { icon: "🛍️", title: t("home.feature_1_title"), desc: t("home.feature_1_desc") },
    { icon: "💱", title: t("home.feature_2_title"), desc: t("home.feature_2_desc") },
    { icon: "📦", title: t("home.feature_3_title"), desc: t("home.feature_3_desc") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-light border border-red-200 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-6">
          🛒 {t("home.badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {t("home.hero_title")}{" "}
          <span className="text-primary">{t("home.hero_highlight")}</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
          {t("home.hero_subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            {t("home.cta_browse")}
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {t("home.cta_register")}
          </Link>
        </div>

        {/* Live rate */}
        {rate && (
          <div className="mt-8 inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-5 py-2 text-sm shadow-sm">
            <span className="text-gray-500">{t("home.rate_today")}</span>
            <span className="font-bold text-gray-900">1 ¥ = {formatVND(rate.rateVndPerCny)}</span>
            <span className="text-xs text-gray-400">({rate.source})</span>
          </div>
        )}
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-8">
        {FEATURES.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm"
          >
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{t("product.featured")}</h2>
            <Link
              to="/products"
              className="text-sm text-primary hover:underline font-medium"
            >
              {t("home.see_all")}
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Platforms */}
      <section className="py-10 border-t border-gray-100">
        <p className="text-center text-sm text-gray-400 mb-6">{t("home.supported_by")}</p>
        <div className="flex flex-wrap justify-center gap-4">
          {PLATFORM_LIST.map(({ name, icon }) => (
            <div
              key={name}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm"
            >
              <span className="text-2xl">{icon}</span>
              <span className="font-medium text-gray-700">{name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Platform names are proper nouns — not translated
const PLATFORM_LIST = [
  { name: "Taobao",      icon: "🛒" },
  { name: "1688",        icon: "🏭" },
  { name: "AliExpress",  icon: "🌍" },
  { name: "eBay",        icon: "🔵" },
  { name: "Rakuten",     icon: "🇯🇵" },
];
