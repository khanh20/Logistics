import { useState } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Tag,
  Typography,
  message,
  Modal,
  Form,
  Select,
} from "antd";
import { SearchOutlined, UnlockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { financeApi } from "~/lib/api/finance";
import { PaymentLockStatusEnum, ReleaseReasonEnum } from "~/lib/enums/finance";
import {
  PAYMENT_LOCK_STATUS_COLORS,
  PAYMENT_LOCK_STATUS_LABELS,
  PAYMENT_LOCK_TYPE_LABELS,
  RELEASE_REASON_LABELS,
} from "~/lib/constants/finance";
import type { PaymentLockDto } from "~/lib/types/finance";

const { Title } = Typography;

export default function AdminPaymentLocksPage() {
  const [orderId, setOrderId] = useState("");
  const [locks, setLocks] = useState<PaymentLockDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState<PaymentLockDto | null>(null);
  const [form] = Form.useForm();
  const [releasing, setReleasing] = useState(false);

  const fetchPaymentLocksByOrder = async (searchOrderId: string) => {
    if (!searchOrderId) {
      message.warning("Vui lòng nhập mã đơn hàng");
      return;
    }
    setLoading(true);
    try {
      const res = await financeApi.getPaymentLocksByOrder(searchOrderId);
      if (res.data) {
        setLocks(res.data);
      } else {
        setLocks([]);
      }
    } catch (error: any) {
      message.error(error.message || "Lỗi khi lấy dữ liệu khóa thanh toán");
      setLocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchPaymentLocksByOrder(orderId);
  };

  const handleOpenReleaseModal = (lock: PaymentLockDto) => {
    setSelectedLock(lock);
    setIsModalOpen(true);
    form.resetFields();
  };

  const handleRelease = async (values: { releaseReason: ReleaseReasonEnum }) => {
    if (!selectedLock) return;
    setReleasing(true);
    try {
      await financeApi.releasePaymentLock(selectedLock.id, values.releaseReason);
      message.success("Giải phóng khóa thanh toán thành công");
      setIsModalOpen(false);
      // Refresh list
      fetchPaymentLocksByOrder(orderId);
    } catch (error: any) {
      message.error(error.message || "Lỗi khi giải phóng khóa thanh toán");
    } finally {
      setReleasing(false);
    }
  };

  const columns = [
    {
      title: "Mã Khóa",
      dataIndex: "id",
      key: "id",
      render: (text: string) => <Typography.Text copyable>{text}</Typography.Text>,
    },
    {
      title: "Mã Đơn Hàng",
      dataIndex: "orderId",
      key: "orderId",
      render: (text: string) => <Typography.Text copyable>{text}</Typography.Text>,
    },
    {
      title: "Loại Khóa",
      dataIndex: "type",
      key: "type",
      render: (type: any) => PAYMENT_LOCK_TYPE_LABELS[type as keyof typeof PAYMENT_LOCK_TYPE_LABELS] || type,
    },
    {
      title: "Số tiền",
      dataIndex: "amount",
      key: "amount",
      render: (val: number) => (
        <Typography.Text strong>{val.toLocaleString()} ₫</Typography.Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: PaymentLockStatusEnum) => (
        <Tag color={PAYMENT_LOCK_STATUS_COLORS[status] || "default"}>
          {PAYMENT_LOCK_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: "Hết hạn",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (date: string) => date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: PaymentLockDto) => {
        if (record.status === PaymentLockStatusEnum.Active) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<UnlockOutlined />}
              onClick={() => handleOpenReleaseModal(record)}
            >
              Giải phóng
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex justify-between items-center">
          <Title level={3} className="!m-0">Quản lý Khóa Thanh Toán</Title>
        </div>

        <Card className="shadow-sm">
          <Space className="mb-4">
            <Input
              placeholder="Nhập mã đơn hàng..."
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button type="primary" onClick={handleSearch} loading={loading}>
              Tìm kiếm
            </Button>
          </Space>

          <Table
            dataSource={locks}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          />
        </Card>
      </Space>

      <Modal
        title="Giải phóng khóa thanh toán"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={releasing}
      >
        <Form form={form} layout="vertical" onFinish={handleRelease}>
          <Form.Item
            name="releaseReason"
            label="Lý do giải phóng"
            rules={[{ required: true, message: "Vui lòng chọn lý do giải phóng" }]}
          >
            <Select placeholder="Chọn lý do">
              {Object.entries(RELEASE_REASON_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
