import { useState } from "react";
import { redirect } from "react-router";
import { Alert, Button, Form, Input, InputNumber, Select } from "antd";
import { store } from "~/lib/feature/store";
import { aiApi } from "~/lib/api/logistics";
import { formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  BORDER_CROSSINGS,
  BORDER_CROSSING_LABEL,
  ALERT_SEVERITY_LABEL,
  ALERT_SEVERITY_COLOR,
  SEASON_OPTIONS,
} from "~/lib/constants/logistics";
import type { BorderAlert, TransitForecast, TransitForecastBody } from "~/lib/types/logistics";
import type { Route } from "./+types/forecast";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Dự báo vận chuyển — MuaHo" }];
}

export async function clientLoader() {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await aiApi.listBorderAlerts();
  return { alerts: res.data ?? [] };
}

export default function ForecastPage({
  loaderData,
}: {
  loaderData: { alerts: BorderAlert[] };
}) {
  const { alerts } = loaderData;
  const [form] = Form.useForm<TransitForecastBody>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TransitForecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleForecast = async () => {
    const values = await form.validateFields();
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.forecast({
        originProvinceCn: values.originProvinceCn,
        weightKg: values.weightKg,
        carrierCn: values.carrierCn,
        borderCrossing: values.borderCrossing,
        season: values.season || undefined,
      });
      setResult(res.data ?? null);
    } catch (err) {
      setError(normalizeError(err).message || "Dự báo thất bại, thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dự báo vận chuyển</h1>
      <p className="text-sm text-gray-500 mb-6">
        Ước tính thời gian hàng đi từ kho Trung Quốc về kho Việt Nam theo cửa khẩu và mùa.
      </p>

      {/* Cảnh báo tắc biên đang active */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3"
            >
              <span className="text-lg leading-none pt-0.5">🚧</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Cửa khẩu {BORDER_CROSSING_LABEL[a.affectedBorder] ?? a.affectedBorder} đang ùn tắc
                  <span
                    className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ALERT_SEVERITY_COLOR[a.severity]}`}
                  >
                    {ALERT_SEVERITY_LABEL[a.severity]}
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {a.estimatedDelayDays != null && `Chậm dự kiến ~${a.estimatedDelayDays} ngày. `}
                  {a.description}
                  <span className="text-gray-400"> · {formatDate(a.createdAt)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ borderCrossing: "HuuNghi", weightKg: 1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Form.Item
              name="originProvinceCn"
              label="Tỉnh gửi hàng (TQ)"
              rules={[{ required: true, message: "Nhập tỉnh gửi hàng." }]}
            >
              <Input placeholder="VD: Quảng Châu" />
            </Form.Item>
            <Form.Item
              name="carrierCn"
              label="Đơn vị vận chuyển nội địa TQ"
              rules={[{ required: true, message: "Nhập carrier TQ." }]}
            >
              <Input placeholder="VD: SF Express, ZTO..." />
            </Form.Item>
            <Form.Item
              name="weightKg"
              label="Cân nặng (kg)"
              rules={[{ required: true, message: "Nhập cân nặng." }]}
            >
              <InputNumber className="w-full" min={0.1} step={0.5} addonAfter="kg" />
            </Form.Item>
            <Form.Item
              name="borderCrossing"
              label="Cửa khẩu"
              rules={[{ required: true }]}
            >
              <Select
                options={BORDER_CROSSINGS.map((b) => ({
                  value: b,
                  label: BORDER_CROSSING_LABEL[b],
                }))}
              />
            </Form.Item>
            <Form.Item name="season" label="Mùa (bỏ trống: tự tính theo tháng)">
              <Select allowClear placeholder="Tự động" options={SEASON_OPTIONS} />
            </Form.Item>
          </div>
          <Button type="primary" loading={loading} onClick={handleForecast}>
            Dự báo
          </Button>
        </Form>

        {error && <Alert type="error" showIcon className="mt-4" message={error} />}

        {result && (
          <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-3xl font-bold text-gray-900">
              {result.estDaysMin}–{result.estDaysMax}{" "}
              <span className="text-base font-medium text-gray-500">ngày</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Tuyến {result.originProvinceCn} → {result.borderCrossing} · {result.carrierCn} ·{" "}
              {result.weightKg}kg
              {result.season ? ` · mùa ${result.season}` : ""}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Độ tin cậy {(result.confidencePct * 100).toFixed(0)}% — dự báo lúc{" "}
              {formatDate(result.forecastedAt)}
            </p>
            {result.borderAlertApplied && (
              <Alert
                type="warning"
                showIcon
                className="mt-3"
                message="Cửa khẩu này đang có cảnh báo ùn tắc — thời gian dự báo đã cộng thêm delay."
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
