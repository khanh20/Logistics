import { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Drawer,
  Form,
  Input,
  Select,
  Segmented,
  DatePicker,
  Popconfirm,
  message,
  Typography,
  Empty,
} from "antd";
import type { Dayjs } from "dayjs";
import { containerTripsApi } from "~/lib/api/logistics";
import { StatusStepper } from "~/components/admin/StatusStepper";
import { useAuth } from "~/lib/hooks/useAuth";
import { formatWeight, formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_COLOR,
  TRIP_NEXT_ACTION,
  BORDER_CROSSINGS,
  BORDER_CROSSING_LABEL,
  SHIPMENT_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import type {
  TripSummary,
  TripDetail,
  ContainerTripStatus,
} from "~/lib/types/logistics";
import type { Route } from "./+types/container-trips._index";

const { Title } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chuyến container — Quản trị" }];
}

export async function clientLoader() {
  const res = await containerTripsApi.list("Loading");
  return { trips: res.data ?? [] };
}

function errMsg(err: unknown, fallback: string) {
  const n = normalizeError(err);
  return (n.code && SHIPMENT_ERROR_MESSAGE[n.code]) || n.message || fallback;
}

export default function AdminContainerTripsPage({
  loaderData,
}: {
  loaderData: { trips: TripSummary[] };
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage");

  const [status, setStatus] = useState<ContainerTripStatus>("Loading");
  const [trips, setTrips] = useState<TripSummary[]>(loaderData.trips);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState<TripDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignForm] = Form.useForm();

  const reload = async (s: ContainerTripStatus) => {
    setLoading(true);
    try {
      const res = await containerTripsApi.list(s);
      setTrips(res.data ?? []);
    } catch (err) {
      message.error(errMsg(err, "Tải danh sách chuyến thất bại."));
    } finally {
      setLoading(false);
    }
  };

  const onStatusChange = (s: ContainerTripStatus) => {
    setStatus(s);
    reload(s);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await containerTripsApi.getDetail(id);
      setDetail(res.data);
    } catch (err) {
      message.error(errMsg(err, "Tải chi tiết chuyến thất bại."));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const res = await containerTripsApi.create({
        tripCode: values.tripCode,
        borderCrossing: values.borderCrossing,
        vehiclePlate: values.vehiclePlate || undefined,
        driverPhone: values.driverPhone || undefined,
        etaVnAt: (values.etaVnAt as Dayjs | undefined)?.toISOString(),
      });
      message.success("Tạo chuyến thành công.");
      setCreateOpen(false);
      createForm.resetFields();
      onStatusChange("Loading");
      if (res.data) setDetail(res.data);
    } catch (err) {
      message.error(errMsg(err, "Tạo chuyến thất bại."));
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!detail) return;
    const values = await assignForm.validateFields();
    const codes: string[] = values.sackCodes ?? [];
    if (codes.length === 0) return;
    setBusy(true);
    try {
      const res = await containerTripsApi.assignSacks(detail.id, {
        sackCodes: codes,
      });
      setDetail(res.data);
      assignForm.resetFields();
      message.success(`Đã gán ${codes.length} bao.`);
    } catch (err) {
      message.error(errMsg(err, "Gán bao thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const advance = async (tripId: string, st: ContainerTripStatus) => {
    const next = TRIP_NEXT_ACTION[st];
    if (!next) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const res =
        next.action === "depart"
          ? await containerTripsApi.depart(tripId, { departureAt: now })
          : next.action === "reachBorder"
            ? await containerTripsApi.reachBorder(tripId)
            : await containerTripsApi.arriveVn(tripId, { arrivedAt: now });
      setDetail(res.data);
      message.success("Cập nhật trạng thái chuyến thành công.");
      reload(status);
    } catch (err) {
      message.error(errMsg(err, "Cập nhật trạng thái thất bại."));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { title: "Mã chuyến", dataIndex: "tripCode", key: "code" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: ContainerTripStatus) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TRIP_STATUS_COLOR[s]}`}
        >
          {TRIP_STATUS_LABEL[s]}
        </span>
      ),
    },
    {
      title: "Cửa khẩu",
      dataIndex: "borderCrossing",
      key: "border",
      render: (b: keyof typeof BORDER_CROSSING_LABEL) =>
        BORDER_CROSSING_LABEL[b] ?? b,
    },
    { title: "Số bao", dataIndex: "totalSacks", key: "sacks" },
    {
      title: "Biển số",
      dataIndex: "vehiclePlate",
      key: "plate",
      render: (v: string | null) => v ?? "—",
    },
    {
      title: "",
      key: "action",
      render: (_: unknown, r: TripSummary) => (
        <Button size="small" onClick={() => openDetail(r.id)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  const nextAction = detail ? TRIP_NEXT_ACTION[detail.status] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Title level={3} className="!mb-0">
          Chuyến container
        </Title>
        {canManage && (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            + Tạo chuyến
          </Button>
        )}
      </div>

      <Segmented<ContainerTripStatus>
        value={status}
        onChange={onStatusChange}
        options={TRIP_STATUSES.map((s) => ({
          value: s,
          label: TRIP_STATUS_LABEL[s],
        }))}
        className="mb-4"
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={trips}
        pagination={false}
      />

      {/* Tạo chuyến */}
      <Modal
        open={createOpen}
        title="Tạo chuyến container"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Tạo chuyến"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="tripCode"
            label="Mã chuyến"
            rules={[{ required: true, message: "Nhập mã chuyến." }]}
          >
            <Input placeholder="VD: TRIP-2026-001" />
          </Form.Item>
          <Form.Item
            name="borderCrossing"
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
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="vehiclePlate" label="Biển số xe">
              <Input />
            </Form.Item>
            <Form.Item name="driverPhone" label="SĐT tài xế">
              <Input />
            </Form.Item>
          </div>
          <Form.Item name="etaVnAt" label="Dự kiến về VN (ETA)">
            <DatePicker
              showTime
              className="w-full"
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Chi tiết chuyến */}
      <Drawer
        open={detail != null}
        onClose={() => setDetail(null)}
        width={600}
        loading={detailLoading}
        title={detail ? `Chuyến ${detail.tripCode}` : ""}
      >
        {detail && (
          <div className="space-y-5">
            <StatusStepper status={detail.status} />

            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-gray-500">Cửa khẩu</span>
              <span className="text-right">
                {BORDER_CROSSING_LABEL[detail.borderCrossing]}
              </span>
              <span className="text-gray-500">Biển số / Tài xế</span>
              <span className="text-right">
                {detail.vehiclePlate ?? "—"}
                {detail.driverPhone ? ` · ${detail.driverPhone}` : ""}
              </span>
              <span className="text-gray-500">Xuất phát</span>
              <span className="text-right">
                {detail.departureCnAt ? formatDate(detail.departureCnAt) : "—"}
              </span>
              <span className="text-gray-500">Về VN</span>
              <span className="text-right">
                {detail.arrivedVnAt ? formatDate(detail.arrivedVnAt) : "—"}
              </span>
            </div>

            {canManage && nextAction && (
              <Popconfirm
                title={`${nextAction.label}?`}
                okText="Xác nhận"
                cancelText="Đóng"
                onConfirm={() => advance(detail.id, detail.status)}
              >
                <Button type="primary" loading={busy} block>
                  {nextAction.label}
                </Button>
              </Popconfirm>
            )}

            {canManage && detail.status === "Loading" && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Gán bao vào chuyến (nhập mã bao)
                </p>
                <Form form={assignForm} onFinish={handleAssign}>
                  <Form.Item name="sackCodes" className="!mb-2">
                    <Select
                      mode="tags"
                      placeholder="Nhập mã bao rồi Enter..."
                      tokenSeparators={[",", " "]}
                      open={false}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={busy}>
                    Gán bao
                  </Button>
                </Form>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Bao trong chuyến ({detail.sacks.length})
              </p>
              {detail.sacks.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa gán bao"
                />
              ) : (
                <ul className="divide-y divide-gray-100">
                  {detail.sacks.map((s) => (
                    <li
                      key={s.sackId}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="font-mono text-xs">{s.sackCode}</span>
                      <span className="text-xs text-gray-400">
                        {s.totalPackages} kiện · {formatWeight(s.totalWeightKg)}
                        {s.sealCode ? ` · chì ${s.sealCode}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
