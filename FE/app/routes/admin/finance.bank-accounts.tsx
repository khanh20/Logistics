import React, { useEffect, useState } from "react";
import { Table, Card, Button, Switch, Modal, Form, Input, Select, Popconfirm, message, Space, Typography, Tag, Row, Col, Statistic } from "antd";
import { PlusOutlined, DeleteOutlined, BankOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchSystemBankAccounts,
  createSystemBankAccount,
  toggleBankAccountStatus,
  deleteSystemBankAccount,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectSystemBankAccounts,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import type { WebhookServiceEnum } from "~/lib/enums/finance";
import { WEBHOOK_SERVICE_LABELS } from "~/lib/constants/finance";
import { BANK_ACCOUNT_RULES } from "~/lib/validations/finance";
import dayjs from "dayjs";
import type { BankAccountDto, CreateBankAccountDto } from "~/lib/types/bankAccount";

const { Title, Text } = Typography;

export default function SystemBankAccountsPage() {
  const dispatch = useAppDispatch();
  const bankAccounts = useAppSelector(selectSystemBankAccounts);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm<CreateBankAccountDto>();

  useEffect(() => {
    dispatch(fetchSystemBankAccounts());
  }, [dispatch]);

  const handleCreate = async (values: CreateBankAccountDto) => {
    try {
      await dispatch(createSystemBankAccount(values)).unwrap();
      message.success("Thêm tài khoản hệ thống thành công");
      setIsModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error || "Lỗi khi thêm tài khoản");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await dispatch(toggleBankAccountStatus(id)).unwrap();
      message.success("Cập nhật trạng thái thành công");
    } catch (error: any) {
      message.error(error || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteSystemBankAccount(id)).unwrap();
      message.success("Xóa tài khoản thành công");
    } catch (error: any) {
      message.error(error || "Lỗi khi xóa tài khoản");
    }
  };

  const activeAccounts = bankAccounts.filter((b) => b.isActive).length;

  const columns = [
    {
      title: "Ngân hàng",
      dataIndex: "bankName",
      key: "bankName",
      render: (text: string, record: BankAccountDto) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" className="text-xs">{record.bankCode}</Text>
        </Space>
      ),
    },
    {
      title: "Số tài khoản",
      dataIndex: "accountNumber",
      key: "accountNumber",
      render: (text: string) => <Text copyable>{text}</Text>,
    },
    {
      title: "Chủ tài khoản",
      dataIndex: "accountHolder",
      key: "accountHolder",
    },
    {
      title: "Chi nhánh",
      dataIndex: "branch",
      key: "branch",
    },
    {
      title: "Webhook",
      dataIndex: "webhookService",
      key: "webhookService",
      render: (val?: WebhookServiceEnum) =>
        val ? <Tag color="purple">{WEBHOOK_SERVICE_LABELS[val]}</Tag> : <Text type="secondary">-</Text>
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean, record: BankAccountDto) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleStatus(record.id)}
        />
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (val?: string) => val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: BankAccountDto) => (
        <Popconfirm
          title="Xóa tài khoản"
          description="Bạn có chắc chắn muốn xóa tài khoản này?"
          onConfirm={() => handleDelete(record.id)}
          okText="Đồng ý"
          cancelText="Hủy"
        >
          <Button danger icon={<DeleteOutlined />} type="text" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={2} className="!mb-0">Tài khoản hệ thống</Title>
          <Text type="secondary">Quản lý các tài khoản ngân hàng nhận tiền của hệ thống</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
          size="large"
        >
          Thêm tài khoản
        </Button>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng số tài khoản"
              value={bankAccounts.length}
              prefix={<BankOutlined className="text-blue-500 mr-2" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tài khoản hoạt động"
              value={activeAccounts}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="shadow-sm">
        <Table
          columns={columns}
          dataSource={bankAccounts}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          size="middle"
        />
      </Card>

      <Modal
        title="Thêm tài khoản hệ thống"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        destroyOnClose
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="bankName" label="Tên ngân hàng" rules={BANK_ACCOUNT_RULES.bankName}>
                <Input placeholder="VD: Vietcombank" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bankCode" label="Mã NH (BIN)" rules={BANK_ACCOUNT_RULES.bankCode}>
                <Input placeholder="VD: VCB" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="accountNumber" label="Số tài khoản" rules={BANK_ACCOUNT_RULES.accountNumber}>
                <Input placeholder="VD: 1903..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="accountHolder" label="Chủ tài khoản" rules={BANK_ACCOUNT_RULES.accountHolder}>
                <Input placeholder="VD: NGUYEN VAN A" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="branch" label="Chi nhánh" rules={BANK_ACCOUNT_RULES.branch}>
            <Input placeholder="VD: Chi nhánh HCM" />
          </Form.Item>

          <Form.Item name="webhookService" label="Dịch vụ Webhook (Tùy chọn)">
            <Select placeholder="Chọn dịch vụ đồng bộ giao dịch" allowClear>
              {Object.entries(WEBHOOK_SERVICE_LABELS).map(([key, label]) => (
                <Select.Option key={key} value={Number(key)}>
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
