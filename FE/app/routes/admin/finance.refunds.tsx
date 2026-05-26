import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import {
  REFUND_REASON_LABELS,
  REFUND_STATUS_COLORS,
  REFUND_STATUS_LABELS,
} from "~/lib/constants/finance";
import { RefundReasonEnum, RefundStatusEnum } from "~/lib/enums/finance";
import type { CreateRefundDto, RefundDto } from "~/lib/types/adminFinance";
import { REFUND_RULES } from "~/lib/validations/finance";
import { numberFormatter, numberParser } from "~/lib/utils/format";

const { Title, Text } = Typography;

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingRefundId, setRejectingRefundId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [form] = Form.useForm();

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const res = await adminFinanceApi.getAllRefunds();
      if (res.success) {
        setRefunds(res.data || []);
      } else {
        message.error(res.message || "Lỗi khi tải danh sách hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi tải danh sách hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleCreateRefund = async (values: CreateRefundDto) => {
    try {
      setSubmitting(true);
      const res = await adminFinanceApi.createRefund(values);
      if (res.success) {
        message.success("Tạo yêu cầu hoàn tiền thành công");
        setIsModalVisible(false);
        form.resetFields();
        fetchRefunds();
      } else {
        message.error(res.message || "Lỗi khi tạo hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi tạo hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setSubmitting(true);
      const res = await adminFinanceApi.approveRefund(id);
      if (res.success) {
        message.success("Duyệt hoàn tiền thành công");
        fetchRefunds();
      } else {
        message.error(res.message || "Lỗi khi duyệt hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi duyệt hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRefundId) return;
    if (!rejectReason.trim()) {
      message.warning("Vui lòng nhập lý do từ chối");
      return;
    }
    try {
      setSubmitting(true);
      const res = await adminFinanceApi.rejectRefund(rejectingRefundId, rejectReason);
      if (res.success) {
        message.success("Đã từ chối hoàn tiền");
        setRejectModalVisible(false);
        setRejectingRefundId(null);
        setRejectReason("");
        fetchRefunds();
      } else {
        message.error(res.message || "Lỗi khi từ chối hoàn tiền");
      }
    } catch (error) {
      console.error(error);
      message.error("Đã xảy ra lỗi khi từ chối hoàn tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<RefundDto> = [
    {
      title: "Mã Ví",
      dataIndex: "walletId",
      key: "walletId",
      render: (val: string) => <Text copyable>{val}</Text>,
    },
    {
      title: "Tham chiếu",
      key: "reference",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text>{record.referenceType}</Text>
          <Text type="secondary" copyable>
            {record.referenceId}
          </Text>
        </Space>
      ),
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      render: (val: RefundReasonEnum) => (val ? REFUND_REASON_LABELS[val] : "—"),
    },
    {
      title: "Số tiền",
      key: "amount",
      align: "right",
      render: (_, record) => (
        <Space direction="vertical" size="small" align="end">
          <Text>
            {record.grossAmountVnd.toLocaleString()} ₫
          </Text>
          {record.penaltyVnd > 0 && (
            <Text type="danger" style={{ fontSize: "12px" }}>
              Phạt: -{record.penaltyVnd.toLocaleString()} ₫ ({record.penaltyPct}%)
            </Text>
          )}
          <Text strong type="success">
            Thực: {record.netRefundVnd.toLocaleString()} ₫
          </Text>
        </Space>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (val: RefundStatusEnum) => (
        <Tag color={REFUND_STATUS_COLORS[val] || "default"}>
          {REFUND_STATUS_LABELS[val] || "Không xác định"}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (val: string) => (val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Hành động",
      key: "action",
      align: "center",
      render: (_, record) =>
        record.status === RefundStatusEnum.Pending ? (
          <Space>
            <Popconfirm
              title="Xác nhận duyệt"
              description="Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này?"
              onConfirm={() => handleApprove(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
              okButtonProps={{ loading: submitting }}
            >
              <Button type="primary" size="small" icon={<FiCheck />} loading={submitting} />
            </Popconfirm>
            <Button
              danger
              size="small"
              icon={<FiX />}
              onClick={() => {
                setRejectingRefundId(record.id);
                setRejectModalVisible(true);
              }}
            />
          </Space>
        ) : (
          "—"
        ),
    },
  ];

  const totalRefundAmount = refunds
    .filter((r) => r.status === RefundStatusEnum.Completed)
    .reduce((acc, curr) => acc + curr.netRefundVnd, 0);

  const pendingRefundsCount = refunds.filter(
    (r) => r.status === RefundStatusEnum.Pending
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <Title level={3} className="!mb-0">
            Quản lý Hoàn tiền
          </Title>
          <Text type="secondary">Quản lý và xét duyệt các yêu cầu hoàn tiền</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<FiPlus />}
            onClick={() => setIsModalVisible(true)}
          >
            Tạo hoàn tiền
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Chờ duyệt"
              value={pendingRefundsCount}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng tiền đã hoàn"
              value={totalRefundAmount}
              suffix="₫"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="shadow-sm">
        <Table
          columns={columns}
          dataSource={refunds}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          size="middle"
        />
      </Card>

      <Modal
        title="Tạo yêu cầu hoàn tiền"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Tạo mới"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRefund}
          className="mt-4"
        >
          <Form.Item
            name="walletId"
            label="Mã ví khách hàng"
            rules={REFUND_RULES.walletId}
          >
            <Input placeholder="Nhập mã ví (Wallet ID)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="referenceType"
                label="Loại tham chiếu"
                rules={REFUND_RULES.referenceType}
                initialValue="Order"
              >
                <Input placeholder="Ví dụ: Order, Topup..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="referenceId"
                label="Mã tham chiếu"
                rules={REFUND_RULES.referenceId}
              >
                <Input placeholder="Mã đơn hàng hoặc mã giao dịch" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="grossAmountVnd"
                label="Số tiền hoàn (VND)"
                rules={REFUND_RULES.grossAmountVnd}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={1000}
                  formatter={numberFormatter}
                  parser={numberParser}
                  placeholder="Nhập số tiền"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="penaltyPct"
                label="Phần trăm phạt (%)"
                initialValue={0}
                rules={REFUND_RULES.penaltyPct}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  max={100}
                  placeholder="Phần trăm phạt (nếu có)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Lý do hoàn tiền"
          >
            <Select placeholder="Chọn lý do">
              {Object.entries(REFUND_REASON_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Từ chối hoàn tiền"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason("");
          setRejectingRefundId(null);
        }}
        onOk={handleReject}
        confirmLoading={submitting}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
      >
        <div className="mt-4">
          <Text className="mb-2 block">
            Vui lòng nhập lý do từ chối yêu cầu hoàn tiền này:
          </Text>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Lý do từ chối..."
          />
        </div>
      </Modal>
    </div>
  );
}
