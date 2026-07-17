import { useState } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Alert,
  message,
  Typography,
} from "antd";
import { warehouseApi } from "~/lib/api/logistics";
import { BarcodeScanInput } from "~/components/admin/BarcodeScanInput";
import { useAuth } from "~/lib/hooks/useAuth";
import { formatWeight, formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  WAREHOUSE_TYPE_LABEL,
  CN_WAREHOUSE_TYPES,
  RECEIPT_CONDITIONS,
  RECEIPT_CONDITION_LABEL,
} from "~/lib/constants/logistics";
import type {
  Warehouse,
  WarehouseType,
  ReceiveScanResult,
} from "~/lib/types/logistics";
import type { Route } from "./+types/warehouses._index";

const { Title, Text } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kho bãi — Quản trị" }];
}

export async function clientLoader() {
  const res = await warehouseApi.list();
  return { warehouses: res.data ?? [] };
}

export default function AdminWarehousesPage({
  loaderData,
}: {
  loaderData: { warehouses: Warehouse[] };
}) {
  const { warehouses } = loaderData;
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage");

  const [form] = Form.useForm();
  const [target, setTarget] = useState<Warehouse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReceiveScanResult | null>(null);

  const isCn = target ? CN_WAREHOUSE_TYPES.includes(target.type) : false;

  const openReceive = (wh: Warehouse) => {
    setResult(null);
    setTarget(wh);
    form.resetFields();
    form.setFieldsValue({ condition: "Ok" });
  };

  const closeReceive = () => {
    setTarget(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!target) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const res = isCn
        ? await warehouseApi.receiveCn(target.id, values)
        : await warehouseApi.receiveVn(target.id, values);
      setResult(res.data);
      message.success(isCn ? "Nhập kho TQ thành công." : "Nhập kho VN thành công.");
      form.resetFields();
      form.setFieldsValue({ condition: "Ok" });
    } catch (err) {
      message.error(normalizeError(err).message || "Nhập kho thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "Tên kho", dataIndex: "name", key: "name" },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      render: (t: WarehouseType) => (
        <Tag color={CN_WAREHOUSE_TYPES.includes(t) ? "orange" : "blue"}>
          {WAREHOUSE_TYPE_LABEL[t] ?? t}
        </Tag>
      ),
    },
    {
      title: "Vị trí",
      key: "loc",
      render: (_: unknown, r: Warehouse) => `${r.city}, ${r.country}`,
    },
    {
      title: "Sức chứa",
      dataIndex: "maxCapacityM3",
      key: "cap",
      render: (v: number | null) => (v != null ? `${v} m³` : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "active",
      render: (a: boolean) =>
        a ? <Tag color="green">Hoạt động</Tag> : <Tag>Ngừng</Tag>,
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: Warehouse) =>
        canManage && r.isActive ? (
          <Button size="small" onClick={() => openReceive(r)}>
            {CN_WAREHOUSE_TYPES.includes(r.type) ? "Nhập kho TQ" : "Nhập kho VN"}
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={3}>Kho bãi</Title>
      <Text type="secondary">
        Danh sách kho và thao tác nhập kho (quét mã vạch kiện).
      </Text>

      <Table
        className="mt-4"
        rowKey="id"
        columns={columns}
        dataSource={warehouses}
        pagination={false}
      />

      <Modal
        open={target != null}
        title={
          target
            ? `${isCn ? "Nhập kho TQ" : "Nhập kho VN"} — ${target.name}`
            : ""
        }
        onCancel={closeReceive}
        footer={
          result
            ? [
                <Button key="done" type="primary" onClick={closeReceive}>
                  Xong
                </Button>,
              ]
            : [
                <Button key="cancel" onClick={closeReceive}>
                  Đóng
                </Button>,
                <Button
                  key="ok"
                  type="primary"
                  loading={submitting}
                  onClick={handleSubmit}
                >
                  Xác nhận nhập kho
                </Button>,
              ]
        }
        destroyOnClose
      >
        {result ? (
          <div className="space-y-3">
            {result.weightVarianceAlert && (
              <Alert
                type="warning"
                showIcon
                message="Cảnh báo lệch cân nặng"
                description={
                  result.variancePct != null
                    ? `Chênh lệch ${(result.variancePct * 100).toFixed(1)}% so với khai báo.`
                    : "Cân nặng lệch đáng kể so với khai báo."
                }
              />
            )}
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Mã vạch</span>
              <span className="text-right font-mono">{result.barcode}</span>
              <span className="text-gray-500">Khách hàng</span>
              <span className="text-right">{result.customerName}</span>
              <span className="text-gray-500">Đơn hàng</span>
              <span className="text-right font-mono">{result.orderCode}</span>
              <span className="text-gray-500">Cân tính cước</span>
              <span className="text-right">
                {result.chargedWeightKg != null
                  ? formatWeight(result.chargedWeightKg)
                  : "—"}
              </span>
              <span className="text-gray-500">Tình trạng</span>
              <span className="text-right">
                {RECEIPT_CONDITION_LABEL[result.condition] ?? result.condition}
              </span>
              <span className="text-gray-500">Thời điểm</span>
              <span className="text-right">{formatDate(result.receivedAt)}</span>
            </div>
            <Text type="secondary" className="block text-xs">
              Quét kiện tiếp theo bằng cách đóng và mở lại, hoặc bấm Xong.
            </Text>
          </div>
        ) : (
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item
              name="barcode"
              label="Mã vạch kiện"
              rules={[{ required: true, message: "Quét/nhập mã vạch." }]}
            >
              <BarcodeScanInput autoFocus />
            </Form.Item>

            {isCn ? (
              <>
                <Form.Item name="waybillNo" label="Mã vận đơn TQ (tuỳ chọn)">
                  <Input placeholder="Mã vận đơn nội địa TQ" />
                </Form.Item>
                <Form.Item
                  name="actualWeightKg"
                  label="Cân nặng thực tế (kg)"
                  rules={[{ required: true, message: "Nhập cân nặng." }]}
                >
                  <InputNumber className="w-full" min={0} step={0.1} />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item
                  name="zoneCode"
                  label="Vị trí trong kho (zone)"
                  rules={[{ required: true, message: "Nhập mã vị trí." }]}
                >
                  <Input placeholder="VD: A-3-2" />
                </Form.Item>
                <Form.Item
                  name="actualWeightKg"
                  label="Cân lại (kg) — đối soát (tuỳ chọn)"
                >
                  <InputNumber className="w-full" min={0} step={0.1} />
                </Form.Item>
              </>
            )}

            <div className="grid grid-cols-3 gap-x-3">
              <Form.Item name="lengthCm" label="Dài (cm)">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item name="widthCm" label="Rộng (cm)">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
              <Form.Item name="heightCm" label="Cao (cm)">
                <InputNumber className="w-full" min={0} />
              </Form.Item>
            </div>

            <Form.Item
              name="condition"
              label="Tình trạng kiện"
              rules={[{ required: true }]}
            >
              <Select
                options={RECEIPT_CONDITIONS.map((c) => ({
                  value: c,
                  label: RECEIPT_CONDITION_LABEL[c],
                }))}
              />
            </Form.Item>

            <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
