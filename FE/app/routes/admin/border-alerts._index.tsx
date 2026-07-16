import { useState } from "react";
import { useRevalidator } from "react-router";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Typography,
  message,
} from "antd";
import { aiApi } from "~/lib/api/logistics";
import { useAuth } from "~/lib/hooks/useAuth";
import { formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  BORDER_CROSSINGS,
  BORDER_CROSSING_LABEL,
  ALERT_SEVERITIES,
  ALERT_SEVERITY_LABEL,
  ALERT_SEVERITY_COLOR,
  ALERT_SOURCE_LABEL,
} from "~/lib/constants/logistics";
import type {
  BorderAlert,
  CreateBorderAlertBody,
  TransitForecast,
} from "~/lib/types/logistics";
import type { Route } from "./+types/border-alerts._index";

const { Title, Text } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Cảnh báo tắc biên — Quản trị" }];
}

export async function clientLoader() {
  const [alertRes, forecastRes] = await Promise.all([
    aiApi.listBorderAlerts(),
    aiApi.recentForecasts(20),
  ]);
  return { alerts: alertRes.data ?? [], forecasts: forecastRes.data ?? [] };
}

export default function AdminBorderAlertsPage({
  loaderData,
}: {
  loaderData: { alerts: BorderAlert[]; forecasts: TransitForecast[] };
}) {
  const { alerts, forecasts } = loaderData;
  const revalidator = useRevalidator();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("shipment.manage");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [form] = Form.useForm<CreateBorderAlertBody>();

  const errMsg = (err: unknown, fallback: string) =>
    normalizeError(err).message || fallback;

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await aiApi.scanBorderCongestion();
      message.info(res.message ?? "Đã quét xong.");
      if ((res.data?.alertsCreated ?? 0) > 0) revalidator.revalidate();
    } catch (err) {
      message.error(errMsg(err, "Quét dữ liệu thất bại."));
    } finally {
      setScanning(false);
    }
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      await aiApi.createBorderAlert(values);
      message.success("Đã tạo cảnh báo tắc biên.");
      setCreateOpen(false);
      form.resetFields();
      revalidator.revalidate();
    } catch (err) {
      message.error(errMsg(err, "Tạo cảnh báo thất bại."));
    } finally {
      setCreating(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await aiApi.resolveBorderAlert(id);
      message.success("Đã gỡ cảnh báo.");
      revalidator.revalidate();
    } catch (err) {
      message.error(errMsg(err, "Gỡ cảnh báo thất bại."));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <Title level={3} className="!mb-0">
          Cảnh báo tắc biên
        </Title>
        {canManage && (
          <div className="flex gap-2">
            <Button loading={scanning} onClick={handleScan}>
              Quét dữ liệu vận hành
            </Button>
            <Button type="primary" onClick={() => setCreateOpen(true)}>
              + Tạo cảnh báo
            </Button>
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <Alert
          type="success"
          showIcon
          message="Không có cảnh báo tắc biên nào đang hoạt động."
          className="mb-6"
        />
      ) : (
        <Table<BorderAlert>
          rowKey="id"
          dataSource={alerts}
          pagination={false}
          className="mb-6"
          columns={[
            {
              title: "Cửa khẩu",
              dataIndex: "affectedBorder",
              render: (b: BorderAlert["affectedBorder"]) =>
                BORDER_CROSSING_LABEL[b] ?? b,
            },
            {
              title: "Mức độ",
              dataIndex: "severity",
              render: (s: BorderAlert["severity"]) => (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ALERT_SEVERITY_COLOR[s]}`}
                >
                  {ALERT_SEVERITY_LABEL[s]}
                </span>
              ),
            },
            {
              title: "Nguồn",
              dataIndex: "source",
              render: (s: BorderAlert["source"]) => ALERT_SOURCE_LABEL[s] ?? s,
            },
            {
              title: "Delay (ngày)",
              dataIndex: "estimatedDelayDays",
              render: (d: number | null) => d ?? "—",
            },
            { title: "Mô tả", dataIndex: "description", ellipsis: true },
            {
              title: "Đã notify",
              dataIndex: "notifiedCustomersCount",
              render: (n: number) => `${n} khách`,
            },
            {
              title: "Tạo lúc",
              dataIndex: "createdAt",
              render: (d: string) => formatDate(d),
            },
            ...(canManage
              ? [
                  {
                    title: "",
                    key: "actions",
                    render: (_: unknown, a: BorderAlert) => (
                      <Popconfirm
                        title="Gỡ cảnh báo này?"
                        okText="Gỡ"
                        cancelText="Không"
                        onConfirm={() => handleResolve(a.id)}
                      >
                        <Button size="small" danger>
                          Gỡ cảnh báo
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      <Title level={4}>Dự báo gần đây</Title>
      <Text type="secondary" className="block mb-3">
        20 lượt dự báo lead time mới nhất (từ khách và nhân viên).
      </Text>
      <Table<TransitForecast>
        rowKey="id"
        dataSource={forecasts}
        pagination={false}
        size="small"
        columns={[
          { title: "Tỉnh gửi (TQ)", dataIndex: "originProvinceCn" },
          { title: "Carrier TQ", dataIndex: "carrierCn" },
          {
            title: "Cửa khẩu",
            dataIndex: "borderCrossing",
            render: (b: string) =>
              BORDER_CROSSING_LABEL[b as keyof typeof BORDER_CROSSING_LABEL] ?? b,
          },
          { title: "Kg", dataIndex: "weightKg" },
          { title: "Mùa", dataIndex: "season", render: (s: string | null) => s ?? "—" },
          {
            title: "Dự báo",
            key: "est",
            render: (_: unknown, f: TransitForecast) =>
              `${f.estDaysMin}–${f.estDaysMax} ngày`,
          },
          {
            title: "Tin cậy",
            dataIndex: "confidencePct",
            render: (c: number) => `${(c * 100).toFixed(0)}%`,
          },
          {
            title: "Tắc biên",
            dataIndex: "borderAlertApplied",
            render: (b: boolean) => (b ? "⚠️ có" : "—"),
          },
          {
            title: "Lúc",
            dataIndex: "forecastedAt",
            render: (d: string) => formatDate(d),
          },
        ]}
      />

      <Modal
        open={createOpen}
        title="Tạo cảnh báo tắc biên"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Tạo cảnh báo"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="affectedBorder"
            label="Cửa khẩu"
            rules={[{ required: true, message: "Chọn cửa khẩu." }]}
          >
            <Select
              options={BORDER_CROSSINGS.map((b) => ({
                value: b,
                label: BORDER_CROSSING_LABEL[b],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="severity"
            label="Mức độ"
            rules={[{ required: true, message: "Chọn mức độ." }]}
          >
            <Select
              options={ALERT_SEVERITIES.map((s) => ({
                value: s,
                label: ALERT_SEVERITY_LABEL[s],
              }))}
            />
          </Form.Item>
          <Form.Item name="estimatedDelayDays" label="Delay ước tính (ngày)">
            <InputNumber className="w-full" min={0} max={30} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea
              rows={3}
              placeholder="VD: Cửa khẩu Hữu Nghị siết kiểm dịch, xe chờ 2-3 ngày..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
