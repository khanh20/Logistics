import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Alert,
  message,
  Typography,
  Table,
  Tag,
} from "antd";
import { packagesApi, domesticWaybillsApi } from "~/lib/api/logistics";
import { BarcodeScanInput } from "~/components/admin/BarcodeScanInput";
import { useAuth } from "~/lib/hooks/useAuth";
import { normalizeError } from "~/lib/utils/errors";
import {
  PACKAGING_TYPES,
  PACKAGING_TYPE_LABEL,
  INSURANCE_LEVELS,
  INSURANCE_LEVEL_LABEL,
  PACKAGE_STATUS_LABEL,
} from "~/lib/constants/logistics";
import { formatDate, formatWeight } from "~/lib/utils/format";
import type {
  PackageStatus,
  PackageSummary,
  PackagingType,
} from "~/lib/types/logistics";
import type { Route } from "./+types/packages._index";

const { Title, Text } = Typography;
const PAGE_SIZE = 20;

const statusColor = (status: PackageStatus) => {
  if (status === "Delivered") return "green";
  if (status === "Lost") return "red";
  if (status === "Returned") return "orange";
  if (status === "InVnWarehouse") return "cyan";
  if (status === "Dispatched") return "blue";
  if (status === "Customs") return "gold";
  if (status === "InTransit") return "purple";
  return "default";
};

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kiện hàng — Quản trị" }];
}

export default function AdminPackagesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage");

  const canSync = hasPermission("shipment.manage");

  const [searching, setSearching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncNo, setSyncNo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [form] = Form.useForm();
  const insuranceOpted = Form.useWatch("insuranceOpted", form);

  const loadPackages = useCallback(async (targetPage: number) => {
    setListLoading(true);
    setListError("");
    try {
      const res = await packagesApi.list(targetPage, PAGE_SIZE);
      setPackages(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch (err) {
      setListError(normalizeError(err).message || "Không tải được danh sách kiện.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages(page);
  }, [loadPackages, page]);

  const handleSearch = async (barcode: string) => {
    if (!barcode) return;
    setSearching(true);
    try {
      const res = await packagesApi.getByBarcode(barcode);
      if (res.data?.id) {
        navigate(`/admin/packages/${res.data.id}`);
      } else {
        message.warning("Không tìm thấy kiện với mã vạch này.");
      }
    } catch (err) {
      const norm = normalizeError(err);
      message.error(
        norm.status === 404
          ? "Không tìm thấy kiện với mã vạch này."
          : norm.message || "Tra cứu thất bại."
      );
    } finally {
      setSearching(false);
    }
  };

  // Đối soát trạng thái vận đơn với carrier (dùng khi nghi webhook miss — GHTK chỉ retry 1 lần)
  const handleSyncWaybill = async () => {
    const trackingNo = syncNo.trim();
    if (!trackingNo) return;
    setSyncing(true);
    try {
      const res = await domesticWaybillsApi.sync(trackingNo);
      if (res.data?.processed) {
        message.success(
          `Đã đối soát: vận đơn chuyển sang "${res.data.newStatus}" (${res.data.affectedPackages} kiện cập nhật).`
        );
      } else {
        message.info("Trạng thái không đổi hoặc carrier không trả dữ liệu.");
      }
    } catch (err) {
      const norm = normalizeError(err);
      message.error(
        norm.status === 404
          ? "Không tìm thấy vận đơn với mã này."
          : norm.message || "Đối soát thất bại."
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      const res = await packagesApi.create({
        customerId: values.customerId,
        orderId: values.orderId,
        packagingType: values.packagingType,
        insuranceOpted: !!values.insuranceOpted,
        insuranceLevel: values.insuranceOpted ? values.insuranceLevel : null,
      });
      message.success("Tạo kiện hàng thành công.");
      setCreateOpen(false);
      form.resetFields();
      if (res.data?.id) navigate(`/admin/packages/${res.data.id}`);
    } catch (err) {
      message.error(normalizeError(err).message || "Tạo kiện thất bại.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Title level={3} className="!mb-0">
          Kiện hàng
        </Title>
        {canManage && (
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            + Tạo kiện
          </Button>
        )}
      </div>

      <Alert
        type="info"
        showIcon
        className="my-4"
        message="Tra cứu kiện theo mã vạch"
        description="Quét/nhập mã vạch để mở nhanh chi tiết, hoặc chọn kiện trong danh sách bên dưới."
      />

      <div className="max-w-md">
        <BarcodeScanInput
          autoFocus
          loading={searching}
          onScan={handleSearch}
          placeholder="Quét hoặc nhập mã vạch để tra cứu..."
        />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <Title level={5} className="!mb-0">
            Danh sách kiện
          </Title>
          <Text type="secondary">{totalCount} kiện</Text>
        </div>

        {listError && (
          <Alert
            type="error"
            showIcon
            className="mb-3"
            message={listError}
            action={<Button size="small" onClick={() => void loadPackages(page)}>Thử lại</Button>}
          />
        )}

        <Table<PackageSummary>
          rowKey="id"
          loading={listLoading}
          dataSource={packages}
          scroll={{ x: 980 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: totalCount,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} kiện`,
            onChange: setPage,
          }}
          columns={[
            {
              title: "Barcode",
              dataIndex: "barcode",
              key: "barcode",
              render: (barcode: string, pkg) => (
                <Button type="link" className="!px-0 font-mono" onClick={() => navigate(`/admin/packages/${pkg.id}`)}>
                  {barcode}
                </Button>
              ),
            },
            {
              title: "Trạng thái",
              dataIndex: "status",
              key: "status",
              render: (status: PackageStatus) => (
                <Tag color={statusColor(status)}>{PACKAGE_STATUS_LABEL[status] ?? status}</Tag>
              ),
            },
            {
              title: "Đóng gói",
              dataIndex: "packagingType",
              key: "packagingType",
              render: (type: PackagingType) =>
                PACKAGING_TYPE_LABEL[type] ?? type,
            },
            {
              title: "Khối lượng tính cước",
              dataIndex: "chargedWeightKg",
              key: "chargedWeightKg",
              render: (weight: number | null) => weight != null ? formatWeight(weight) : "—",
            },
            {
              title: "Order ID",
              dataIndex: "orderId",
              key: "orderId",
              render: (id: string) => <Text copyable={{ text: id }} className="font-mono text-xs">{id.slice(0, 8)}…</Text>,
            },
            {
              title: "Customer ID",
              dataIndex: "customerId",
              key: "customerId",
              render: (id: string) => <Text copyable={{ text: id }} className="font-mono text-xs">{id.slice(0, 8)}…</Text>,
            },
            {
              title: "Ngày tạo",
              dataIndex: "createdAt",
              key: "createdAt",
              render: (createdAt: string) => formatDate(createdAt),
            },
            {
              title: "Thao tác",
              key: "action",
              fixed: "right",
              render: (_: unknown, pkg) => (
                <Button size="small" onClick={() => navigate(`/admin/packages/${pkg.id}`)}>Xem</Button>
              ),
            },
          ]}
        />
      </div>

      {canSync && (
        <div className="mt-8 max-w-md">
          <Title level={5} className="!mb-1">
            Đối soát vận đơn carrier
          </Title>
          <Text type="secondary" className="block mb-3 text-sm">
            Query trạng thái mới nhất từ GHTK khi nghi webhook bị miss (GHTK chỉ
            retry 1 lần) — áp dụng như webhook nếu trạng thái tiến lên.
          </Text>
          <div className="flex gap-2">
            <Input
              value={syncNo}
              onChange={(e) => setSyncNo(e.target.value)}
              onPressEnter={handleSyncWaybill}
              placeholder="Mã vận đơn (label GHTK)..."
            />
            <Button loading={syncing} onClick={handleSyncWaybill}>
              Đối soát
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        title="Tạo kiện hàng mới"
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="Tạo kiện"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ packagingType: "Normal", insuranceOpted: false }}
        >
          <Form.Item
            name="customerId"
            label="Customer ID"
            rules={[{ required: true, message: "Nhập ID khách hàng." }]}
          >
            <Input placeholder="GUID khách hàng" />
          </Form.Item>
          <Form.Item
            name="orderId"
            label="Order ID"
            rules={[{ required: true, message: "Nhập ID đơn hàng." }]}
          >
            <Input placeholder="GUID đơn hàng" />
          </Form.Item>
          <Form.Item name="packagingType" label="Loại đóng gói">
            <Select
              options={PACKAGING_TYPES.map((p) => ({
                value: p,
                label: PACKAGING_TYPE_LABEL[p],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="insuranceOpted"
            label="Mua bảo hiểm"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          {insuranceOpted && (
            <Form.Item
              name="insuranceLevel"
              label="Gói bảo hiểm"
              rules={[{ required: true, message: "Chọn gói bảo hiểm." }]}
            >
              <Select
                options={INSURANCE_LEVELS.map((l) => ({
                  value: l,
                  label: INSURANCE_LEVEL_LABEL[l],
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Text type="secondary" className="block mt-6 text-xs">
        Mẹo: máy quét mã vạch hoạt động như bàn phím — quét xong tự Enter để tra
        cứu.
      </Text>
    </div>
  );
}
