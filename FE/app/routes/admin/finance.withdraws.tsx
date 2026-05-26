import React, { useEffect, useState } from "react";
import {
  Table,
  Card,
  Form,
  Modal,
  Button,
  Tag,
  Space,
  Typography,
  message,
  Input,
  Row,
  Col,
  Statistic
} from "antd";
import { CheckOutlined, CloseOutlined, BankOutlined, ClockCircleOutlined, DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  selectPendingWithdraws,
  selectAdminFinanceStatus
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import {
  fetchPendingWithdraws,
  approveWithdraw,
  rejectWithdraw
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { ReduxStatus } from "~/lib/feature/const";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import { WITHDRAW_STATUS_LABELS, WITHDRAW_STATUS_COLORS } from "~/lib/constants/finance";

const { Title, Text } = Typography;

export default function AdminFinanceWithdraws() {
  const dispatch = useAppDispatch();
  const pendingWithdraws = useAppSelector(selectPendingWithdraws);
  const status = useAppSelector(selectAdminFinanceStatus);

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawResponseDto | null>(null);

  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchPendingWithdraws());
  }, [dispatch]);

  const handleApprove = async () => {
    try {
      const values = await approveForm.validateFields();
      if (selectedWithdraw) {
        await dispatch(approveWithdraw({
          id: selectedWithdraw.id,
          data: { transferRef: values.transferRef }
        })).unwrap();
        message.success("Duyệt yêu cầu rút tiền thành công");
        setApproveModalVisible(false);
        approveForm.resetFields();
      }
    } catch (error: any) {
      if (error?.errorFields) return; // Validation failed
      message.error(error?.message || "Đã xảy ra lỗi khi duyệt");
    }
  };

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (selectedWithdraw) {
        await dispatch(rejectWithdraw({
          id: selectedWithdraw.id,
          data: { reason: values.reason }
        })).unwrap();
        message.success("Từ chối yêu cầu rút tiền thành công");
        setRejectModalVisible(false);
        rejectForm.resetFields();
      }
    } catch (error: any) {
      if (error?.errorFields) return; // Validation failed
      message.error(error?.message || "Đã xảy ra lỗi khi từ chối");
    }
  };

  const openApproveModal = (record: WithdrawResponseDto) => {
    setSelectedWithdraw(record);
    setApproveModalVisible(true);
  };

  const openRejectModal = (record: WithdrawResponseDto) => {
    setSelectedWithdraw(record);
    setRejectModalVisible(true);
  };

  const columns = [
    {
      title: "Mã ví khách hàng",
      dataIndex: "walletId",
      key: "walletId",
      render: (walletId: string) => (
        <Text strong>{walletId.substring(0, 8)}...</Text>
      ),
    },
    {
      title: "Thông tin ngân hàng",
      key: "bankInfo",
      render: (_: any, record: WithdrawResponseDto) => (
        <Space direction="vertical" size={0}>
          <Text strong><BankOutlined /> {record.bankName}</Text>
          <Text>{record.bankAccountNo}</Text>
          <Text type="secondary">{record.accountHolder}</Text>
        </Space>
      ),
    },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      key: "amountVnd",
      render: (amount: number) => (
        <Text strong className="text-red-500">
          {amount.toLocaleString()}₫
        </Text>
      ),
    },
    {
      title: "Phí",
      dataIndex: "feeVnd",
      key: "feeVnd",
      render: (fee: number) => (
        <Text type="secondary">{fee.toLocaleString()}₫</Text>
      ),
    },
    {
      title: "Thực nhận",
      dataIndex: "netAmountVnd",
      key: "netAmountVnd",
      render: (net: number) => (
        <Text strong className="text-green-600">
          {net.toLocaleString()}₫
        </Text>
      ),
    },
    {
      title: "Thời gian tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusCode: number) => (
        <Tag color={WITHDRAW_STATUS_COLORS[statusCode as keyof typeof WITHDRAW_STATUS_COLORS] || "default"}>
          {WITHDRAW_STATUS_LABELS[statusCode as keyof typeof WITHDRAW_STATUS_LABELS] || "Không xác định"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: WithdrawResponseDto) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => openApproveModal(record)}
            size="small"
          >
            Duyệt
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={() => openRejectModal(record)}
            size="small"
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  const totalPendingAmount = pendingWithdraws.reduce((sum, item) => sum + item.amountVnd, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Title level={2}>Duyệt yêu cầu rút tiền</Title>
        <Text type="secondary">Quản lý các yêu cầu rút tiền đang chờ xử lý từ khách hàng</Text>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Yêu cầu chờ duyệt"
              value={pendingWithdraws.length}
              prefix={<ClockCircleOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng tiền cần duyệt"
              value={totalPendingAmount}
              suffix="₫"
              prefix={<DollarOutlined className="text-red-500" />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="shadow-sm">
        <Table
          dataSource={pendingWithdraws}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={status === ReduxStatus.LOADING}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Modal Duyệt */}
      <Modal
        title="Duyệt yêu cầu rút tiền"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false);
          approveForm.resetFields();
        }}
        okText="Xác nhận duyệt"
        cancelText="Hủy"
        confirmLoading={status === ReduxStatus.LOADING}
      >
        {selectedWithdraw && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <p><strong>Mã ví khách hàng:</strong> {selectedWithdraw.walletId}</p>
            <p><strong>Ngân hàng:</strong> {selectedWithdraw.bankName} - {selectedWithdraw.bankAccountNo}</p>
            <p><strong>Tên chủ tài khoản:</strong> {selectedWithdraw.accountHolder}</p>
            <p><strong>Số tiền thực nhận:</strong> <span className="text-green-600 font-semibold">{selectedWithdraw.netAmountVnd.toLocaleString()}₫</span></p>
          </div>
        )}
        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="transferRef"
            label="Mã giao dịch chuyển khoản"
            rules={[{ required: true, message: "Vui lòng nhập mã giao dịch!" }]}
          >
            <Input placeholder="Nhập mã giao dịch từ ngân hàng..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Từ chối */}
      <Modal
        title="Từ chối yêu cầu rút tiền"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
        }}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
        confirmLoading={status === ReduxStatus.LOADING}
      >
        {selectedWithdraw && (
          <div className="mb-4 p-4 bg-gray-50 rounded-md">
            <p><strong>Mã ví khách hàng:</strong> {selectedWithdraw.walletId}</p>
            <p><strong>Tên chủ tài khoản:</strong> {selectedWithdraw.accountHolder}</p>
            <p><strong>Ngân hàng:</strong> {selectedWithdraw.bankName} - {selectedWithdraw.bankAccountNo}</p>
            <p><strong>Số tiền:</strong> <span className="text-red-500 font-semibold">{selectedWithdraw.amountVnd.toLocaleString()}₫</span></p>
          </div>
        )}
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: "Vui lòng nhập lý do từ chối!" }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Sai thông tin ngân hàng, tài khoản không hợp lệ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
