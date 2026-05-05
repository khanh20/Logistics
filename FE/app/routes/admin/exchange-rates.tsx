import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/exchange-rates";
import { exchangeRatesApi } from "~/lib/api/categories";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { formatDate } from "~/lib/utils/format";
import type { ExchangeRate } from "~/lib/types/category";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tỉ giá — MuaHo Admin" }];
}

export async function clientLoader() {
  const [currentRes, historyRes] = await Promise.all([
    exchangeRatesApi.getCurrent(),
    exchangeRatesApi.getHistory(20),
  ]);
  return { current: currentRes.data, history: historyRes.data };
}

export default function ExchangeRatesPage({
  loaderData,
}: {
  loaderData: { current: ExchangeRate; history: ExchangeRate[] };
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(loaderData.current);
  const [history, setHistory] = useState(loaderData.history);
  const [showForm, setShowForm] = useState(false);
  const [rate, setRate]         = useState(current?.rateVndPerCny?.toString() ?? "");
  const [source, setSource]     = useState("Manual");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum < 100 || rateNum > 99999) {
      setError("Tỉ giá phải từ 100 đến 99,999 VNĐ/CNY.");
      return;
    }

    setLoading(true);
    try {
      const res = await exchangeRatesApi.update(rateNum, source);
      setCurrent(res.data);
      setHistory((prev) => [res.data, ...prev]);
      setSuccess(t("exchange_rate.updated"));
      setShowForm(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const formatRate = (r: number) =>
    new Intl.NumberFormat("vi-VN").format(r) + " ₫/¥";

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("exchange_rate.title")}</h1>
        <Button onClick={() => setShowForm((v) => !v)} variant="primary" size="md">
          {t("exchange_rate.update_rate")}
        </Button>
      </div>

      {/* Current rate card */}
      {current && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <p className="text-sm text-gray-500 mb-1">{t("exchange_rate.current")}</p>
          <p className="text-4xl font-bold text-primary">{formatRate(current.rateVndPerCny)}</p>
          <div className="mt-3 flex gap-6 text-sm text-gray-500">
            <span>Nguồn: <strong className="text-gray-700">{current.source}</strong></span>
            <span>Hiệu lực từ: <strong className="text-gray-700">{formatDate(current.effectiveFrom)}</strong></span>
          </div>
        </div>
      )}

      {/* Update form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{t("exchange_rate.update_rate")}</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex gap-4">
              <Input
                label={`Tỉ giá (${t("exchange_rate.rate_vnd_per_cny")})`}
                type="number"
                step="1"
                min="100"
                max="99999"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                hint="VD: 3500 nghĩa là 1¥ = 3,500₫"
                required
                className="flex-1"
              />
              <Input
                label={t("exchange_rate.source")}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="VD: Vietcombank, NHNN"
                required
                className="flex-1"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ {success}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" loading={loading}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{t("exchange_rate.history")}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">{t("exchange_rate.rate_vnd_per_cny")}</th>
              <th className="px-6 py-3 text-left">{t("exchange_rate.source")}</th>
              <th className="px-6 py-3 text-left">{t("exchange_rate.effective_from")}</th>
              <th className="px-6 py-3 text-left">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {history.map((r) => (
              <tr key={r.id} className={r.isCurrent ? "bg-primary-light" : ""}>
                <td className="px-6 py-3 font-medium text-gray-900">{formatRate(r.rateVndPerCny)}</td>
                <td className="px-6 py-3 text-gray-600">{r.source}</td>
                <td className="px-6 py-3 text-gray-600">{formatDate(r.effectiveFrom)}</td>
                <td className="px-6 py-3">
                  {r.isCurrent && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Hiện tại
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.length === 0 && (
          <p className="text-center text-gray-400 py-10">{t("common.no_data")}</p>
        )}
      </div>
    </div>
  );
}
