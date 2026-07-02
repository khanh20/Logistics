import { useState } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  Drawer,
  Form,
  Input,
  Segmented,
  Popconfirm,
  message,
  Typography,
  Space,
  Empty,
} from "antd";
import { sacksApi } from "~/lib/api/logistics";
import { BarcodeScanInput } from "~/components/admin/BarcodeScanInput";
import { useAuth } from "~/lib/hooks/useAuth";
import { formatWeight, formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  SACK_STATUSES,
  SACK_STATUS_LABEL,
  SACK_STATUS_COLOR,
  PACKAGING_TYPE_LABEL,
  SHIPMENT_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import type {
  SackSummary,
  SackDetail,
  SackStatus,
} from "~/lib/types/logistics";
import type { Route } from "./+types/sacks._index";

const { Title } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đóng bao — Quản trị" }];
}

export async function clientLoader() {
  const res = await sacksApi.list("Packing");
  return { sacks: res.data ?? [] };
}

function errMsg(err: unknown, fallback: string) {
  const n = normalizeError(err);
  return (n.code && SHIPMENT_ERROR_MESSAGE[n.code]) || n.message || fallback;
}

export default function AdminSacksPage({
  loaderData,
}: {
  loaderData: { sacks: SackSummary[] };
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage");

  const [status, setStatus] = useState<SackStatus>("Packing");
  const [sacks, setSacks] = useState<SackSummary[]>(loaderData.sacks);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState<SackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sealForm] = Form.useForm();

  const reload = async (s: SackStatus) => {
    setLoading(true);
    try {
      const res = await sacksApi.list(s);
      setSacks(res.data ?? []);
    } catch (err) {
      message.error(errMsg(err, "Tải danh sách bao thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const onStatusChange = (s: SackStatus) => {
    setStatus(s);
    reload(s);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await sacksApi.getDetail(id);
      setDetail(res.data);
    } catch (err) {
      message.error(errMsg(err, "Tải chi tiết bao thất bại."));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const res = await sacksApi.create({ sackCode: values.sackCode || undefined });
      message.success("Tạo bao thành công.");
      setCreateOpen(false);
      createForm.resetFields();
      onStatusChange("Packing");
      if (res.data) setDetail(res.data);
    } catch (err) {
      message.error(errMsg(err, "Tạo bao thất bại."));
    } finally {
      setCreating(false);
    }
  };

  const handleAddPackage = async (barcode: string) => {
    if (!detail || !barcode) return;
    setBusy(true);
    try {
      const res = await sacksApi.addPackage(detail.id, { barcode });
      setDetail(res.data);
      message.success(`Đã thêm kiện ${barcode}.`);
    } catch (err) {
      message.error(errMsg(err, "Thêm kiện thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const handleRemovePackage = async (barcode: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      const res = await sacksApi.removePackage(detail.id, barcode);
      setDetail(res.data);
      message.success(`Đã rã kiện ${barcode}.`);
    } catch (err) {
      message.error(errMsg(err, "Rã kiện thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const handleSeal = async () => {
    if (!detail) return;
    const values = await sealForm.validateFields();
    setBusy(true);
    try {
      const res = await sacksApi.seal(detail.id, { sealCode: values.sealCode });
      setDetail(res.data);
      sealForm.resetFields();
      message.success("Đã kẹp chì bao.");
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Kẹp chì thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: "Mã bao", dataIndex: "sackCode", key: "code" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: SackStatus) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SACK_STATUS_COLOR[s]}`}
        >
          {SACK_STATUS_LABEL[s]}
        </span>
      ),
    },
    { title: "Số kiện", dataIndex: "totalPackages", key: "pkgs" },
    {
      title: "Khối lượng",
      dataIndex: "totalWeightKg",
      key: "weight",
      render: (w: number) => formatWeight(w),
    },
    {
      title: "Mã chì",
      dataIndex: "sealCode",
      key: "seal",
      render: (c: string | null) => c ?? "—",
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: SackSummary) => (
        <Button size="small" onClick={() => openDetail(r.id)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  const isPacking = detail?.status === "Packing";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={3} className="!mb-0">
          Đóng bao
        </Title>
        {canManage && (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            + Tạo bao
          </Button>
        )}
      </div>

      <Segmented<SackStatus>
        value={status}
        onChange={onStatusChange}
        options={SACK_STATUSES.map((s) => ({
          value: s,
          label: SACK_STATUS_LABEL[s],
        }))}
        className="mb-4"
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={sacks}
        pagination={false}
      />

      {/* Tạo bao */}
      <Modal
        open={createOpen}
        title="Tạo bao mới"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Tạo bao"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="sackCode"
            label="Mã bao (để trống = tự sinh)"
            tooltip="Bỏ trống để hệ thống tự tạo mã bao."
          >
            <Input placeholder="VD: SACK-2026-001" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Chi tiết bao */}
      <Drawer
        open={detail != null}
        onClose={() => setDetail(null)}
        width={560}
        loading={detailLoading}
        title={detail ? `Bao ${detail.sackCode}` : ""}
      >
        {detail && (
          <div className="space-y-4">
            <Space size="middle" wrap>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SACK_STATUS_COLOR[detail.status]}`}
              >
                {SACK_STATUS_LABEL[detail.status]}
              </span>
              <span className="text-sm text-gray-500">
                {detail.totalPackages} kiện · {formatWeight(detail.totalWeightKg)}
              </span>
              {detail.sealCode && (
                <span className="text-sm text-gray-500">
                  Chì: {detail.sealCode}
                </span>
              )}
            </Space>

            {canManage && isPacking && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Thêm kiện vào bao
                </p>
                <BarcodeScanInput
                  onScan={handleAddPackage}
                  loading={busy}
                  placeholder="Quét mã vạch kiện để thêm..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Lưu ý: không trộn kiện dễ vỡ với kiện thường (BE sẽ chặn).
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Kiện trong bao ({detail.packages.length})
              </p>
              {detail.packages.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bao trống" />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {detail.packages.map((p) => (
                    <li
                      key={p.packageId}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-gray-800">
                          {p.barcode}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          {PACKAGING_TYPE_LABEL[p.packagingType] ??
                            p.packagingType}
                          {p.chargedWeightKg != null
                            ? ` · ${formatWeight(p.chargedWeightKg)}`
                            : ""}
                        </span>
                      </div>
                      {canManage && isPacking && (
                        <Popconfirm
                          title={`Rã kiện ${p.barcode}?`}
                          okText="Rã"
                          cancelText="Đóng"
                          onConfirm={() => handleRemovePackage(p.barcode)}
                        >
                          <Button size="small" danger type="text">
                            Rã
                          </Button>
                        </Popconfirm>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canManage && isPacking && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Kẹp chì (niêm phong bao)
                </p>
                <Form form={sealForm} layout="inline" onFinish={handleSeal}>
                  <Form.Item
                    name="sealCode"
                    rules={[{ required: true, message: "Nhập mã chì." }]}
                  >
                    <Input placeholder="Mã chì (seal code)" />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={busy}
                      disabled={detail.packages.length === 0}
                    >
                      Kẹp chì
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Tạo: {formatDate(detail.createdAt)}
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
