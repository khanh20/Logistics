import { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Segmented,
  message,
  Typography,
} from "antd";
import { customsApi } from "~/lib/api/logistics";
import { useAuth } from "~/lib/hooks/useAuth";
import {
  formatVND,
  formatDate,
  numberFormatter,
  numberParser,
} from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  CUSTOMS_STATUSES,
  CUSTOMS_STATUS_LABEL,
  CUSTOMS_STATUS_COLOR,
  CLEARANCE_TYPES,
  CLEARANCE_TYPE_LABEL,
  SHIPMENT_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import type {
  CustomsClearance,
  CustomsStatus,
} from "~/lib/types/logistics";
import type { Route } from "./+types/customs._index";

const { Title } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Hải quan — Quản trị" }];
}

export async function clientLoader() {
  const res = await customsApi.list("Pending");
  return { items: res.data ?? [] };
}

function errMsg(err: unknown, fallback: string) {
  const n = normalizeError(err);
  return (n.code && SHIPMENT_ERROR_MESSAGE[n.code]) || n.message || fallback;
}

export default function AdminCustomsPage({
  loaderData,
}: {
  loaderData: { items: CustomsClearance[] };
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("shipment.manage");

  const [status, setStatus] = useState<CustomsStatus>("Pending");
  const [items, setItems] = useState<CustomsClearance[]>(loaderData.items);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<CustomsClearance | null>(null);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const editStatus: CustomsStatus | undefined = Form.useWatch("status", editForm);

  const reload = async (s: CustomsStatus) => {
    setLoading(true);
    try {
      const res = await customsApi.list(s);
      setItems(res.data ?? []);
    } catch (err) {
      message.error(errMsg(err, "Tải danh sách hồ sơ thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const onStatusChange = (s: CustomsStatus) => {
    setStatus(s);
    reload(s);
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      await customsApi.create({
        containerTripId: values.containerTripId,
        clearanceType: values.clearanceType,
        declaredValueVnd: values.declaredValueVnd ?? undefined,
        hsCodeSummary: values.hsCodeSummary || undefined,
      });
      message.success("Tạo hồ sơ hải quan thành công.");
      setCreateOpen(false);
      createForm.resetFields();
      onStatusChange("Pending");
    } catch (err) {
      message.error(errMsg(err, "Tạo hồ sơ thất bại."));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: CustomsClearance) => {
    setEditing(c);
    editForm.setFieldsValue({
      status: c.status,
      heldReason: c.heldReason ?? undefined,
      customsOfficerName: c.customsOfficerName ?? undefined,
      dutyPaidVnd: c.dutyPaidVnd ?? undefined,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      await customsApi.update(editing.id, {
        status: values.status,
        heldReason: values.status === "Held" ? values.heldReason : undefined,
        customsOfficerName: values.customsOfficerName || undefined,
        dutyPaidVnd: values.dutyPaidVnd ?? undefined,
      });
      message.success("Cập nhật hồ sơ thành công.");
      setEditing(null);
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Cập nhật hồ sơ thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: "Mã chuyến",
      dataIndex: "tripCode",
      key: "trip",
      render: (c: string | null) => c ?? "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: CustomsStatus) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CUSTOMS_STATUS_COLOR[s]}`}
        >
          {CUSTOMS_STATUS_LABEL[s]}
        </span>
      ),
    },
    {
      title: "Loại hình",
      dataIndex: "clearanceType",
      key: "type",
      render: (t: keyof typeof CLEARANCE_TYPE_LABEL) =>
        CLEARANCE_TYPE_LABEL[t] ?? t,
    },
    {
      title: "Giá trị khai báo",
      dataIndex: "declaredValueVnd",
      key: "declared",
      render: (v: number | null) => (v != null ? formatVND(v) : "—"),
    },
    {
      title: "Thuế đã nộp",
      dataIndex: "dutyPaidVnd",
      key: "duty",
      render: (v: number | null) => (v != null ? formatVND(v) : "—"),
    },
    { title: "Số kiện", dataIndex: "affectedPackages", key: "pkgs" },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: CustomsClearance) =>
        canManage ? (
          <Button size="small" onClick={() => openEdit(r)}>
            Cập nhật
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={3} className="!mb-0">
          Hồ sơ hải quan
        </Title>
        {canManage && (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            + Tạo hồ sơ
          </Button>
        )}
      </div>

      <Segmented<CustomsStatus>
        value={status}
        onChange={onStatusChange}
        options={CUSTOMS_STATUSES.map((s) => ({
          value: s,
          label: CUSTOMS_STATUS_LABEL[s],
        }))}
        className="mb-4"
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        expandable={{
          expandedRowRender: (r) => (
            <div className="text-sm text-gray-600 space-y-1">
              {r.hsCodeSummary && <div>HS code: {r.hsCodeSummary}</div>}
              {r.customsOfficerName && (
                <div>Cán bộ: {r.customsOfficerName}</div>
              )}
              {r.heldReason && (
                <div className="text-red-600">Lý do giữ: {r.heldReason}</div>
              )}
              {r.clearedAt && <div>Thông quan: {formatDate(r.clearedAt)}</div>}
            </div>
          ),
        }}
      />

      {/* Tạo hồ sơ */}
      <Modal
        open={createOpen}
        title="Tạo hồ sơ hải quan"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Tạo hồ sơ"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="containerTripId"
            label="Container Trip ID"
            rules={[{ required: true, message: "Nhập ID chuyến." }]}
            tooltip="Lấy ID chuyến từ màn Chuyến container."
          >
            <Input placeholder="GUID chuyến container" />
          </Form.Item>
          <Form.Item
            name="clearanceType"
            label="Loại hình thông quan"
            rules={[{ required: true, message: "Chọn loại hình." }]}
          >
            <Select
              options={CLEARANCE_TYPES.map((t) => ({
                value: t,
                label: CLEARANCE_TYPE_LABEL[t],
              }))}
            />
          </Form.Item>
          <Form.Item name="declaredValueVnd" label="Giá trị khai báo (VND)">
            <InputNumber
              className="w-full"
              min={0}
              formatter={numberFormatter}
              parser={numberParser}
            />
          </Form.Item>
          <Form.Item name="hsCodeSummary" label="Tóm tắt HS code">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cập nhật hồ sơ */}
      <Modal
        open={editing != null}
        title={editing ? `Cập nhật hồ sơ — ${editing.tripCode ?? ""}` : ""}
        onCancel={() => setEditing(null)}
        onOk={handleUpdate}
        okText="Lưu"
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select
              options={CUSTOMS_STATUSES.map((s) => ({
                value: s,
                label: CUSTOMS_STATUS_LABEL[s],
              }))}
            />
          </Form.Item>
          {editStatus === "Held" && (
            <Form.Item
              name="heldReason"
              label="Lý do giữ hàng"
              rules={[{ required: true, message: "Nhập lý do giữ hàng." }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          )}
          <Form.Item name="customsOfficerName" label="Cán bộ hải quan">
            <Input />
          </Form.Item>
          <Form.Item name="dutyPaidVnd" label="Thuế đã nộp (VND)">
            <InputNumber
              className="w-full"
              min={0}
              formatter={numberFormatter}
              parser={numberParser}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
