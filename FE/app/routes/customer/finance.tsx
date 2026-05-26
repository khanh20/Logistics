import React, { useEffect } from "react";
import { Link } from "react-router";
import { 
  Card, 
  Tabs, 
  Form, 
  InputNumber, 
  Button, 
  Table, 
  Tag, 
  Typography, 
  Statistic, 
  Row, 
  Col, 
  Space,
  Alert,
  message,
  Select
} from "antd";
import { 
  WalletOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { 
  fetchMyWallet, 
  fetchMyTopups, 
  fetchMyWithdraws, 
  submitTopup, 
  submitWithdraw,
  fetchMyBankAccounts,
  fetchSystemBankAccounts,
  createZaloPayPayment
} from "~/lib/feature/finance/financeThunk";
import { 
  selectWallet, 
  selectTopups, 
  selectWithdraws, 
  selectFinanceStatus, 
  selectFinanceError,
  selectBankAccounts,
  selectSystemBankAccounts
} from "~/lib/feature/finance/financeSelector";
import { ReduxStatus } from "~/lib/feature/const";
import dayjs from "dayjs";

import { 
  TOPUP_STATUS_LABELS, 
  TOPUP_STATUS_COLORS,
  WITHDRAW_STATUS_LABELS,
  WITHDRAW_STATUS_COLORS 
} from "~/lib/constants/finance";
import { TopupStatusEnum, WithdrawStatusEnum } from "~/lib/enums/finance";
import { TOPUP_RULES, WITHDRAW_RULES } from "~/lib/validations/finance";
import type { WalletDto, TopupResponseDto, WithdrawResponseDto } from "~/lib/types/finance";
import type { BankAccountDto } from "~/lib/types/bankAccount";
import { numberFormatter, numberParser } from "~/lib/utils/format";

const { Title, Text } = Typography;

const FinancePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector(selectWallet);
  const topups = useAppSelector(selectTopups);
  const withdraws = useAppSelector(selectWithdraws);
  const status = useAppSelector(selectFinanceStatus);
  const error = useAppSelector(selectFinanceError);
  const bankAccounts = useAppSelector(selectBankAccounts);
  const systemBankAccounts = useAppSelector(selectSystemBankAccounts) || [];

  const activeBankAccounts = bankAccounts.filter((b) => b.isActive);
  const activeSystemBankAccounts = systemBankAccounts.filter((b) => b.isActive);

  const [topupForm] = Form.useForm();
  const [withdrawForm] = Form.useForm();

  useEffect(() => {
    dispatch(fetchMyWallet());
    dispatch(fetchMyTopups());
    dispatch(fetchMyWithdraws());
    dispatch(fetchMyBankAccounts());
    dispatch(fetchSystemBankAccounts());
  }, [dispatch]);

  const handleZaloPayPayment = async (topupId: string) => {
    try {
      const res = await dispatch(createZaloPayPayment(topupId)).unwrap();
      if (res && res.payUrl) {
         window.open(res.payUrl, '_blank');
      } else {
         message.error("Không nhận được URL thanh toán");
      }
    } catch (err: any) {
      message.error(err || "Lỗi tạo thanh toán ZaloPay");
    }
  };

  const onTopupSubmit = async (values: { amount: number; bankAccountId: string }) => {
    try {
      await dispatch(submitTopup({ 
        amount: values.amount, 
        bankAccountId: values.bankAccountId 
      })).unwrap();
      message.success("Yêu cầu nạp tiền đã được gửi!");
      topupForm.resetFields();
    } catch (err: any) {
      message.error(err || "Không thể gửi yêu cầu nạp tiền");
    }
  };

  const onWithdrawSubmit = async (values: { amount: number; bankAccountId: string }) => {
    if (wallet && values.amount > wallet.availableBalance) {
      message.error("Số dư khả dụng không đủ");
      return;
    }

    try {
      await dispatch(submitWithdraw({ 
        amount: values.amount, 
        bankAccountId: values.bankAccountId 
      })).unwrap();
      message.success("Yêu cầu rút tiền đã được gửi!");
      withdrawForm.resetFields();
    } catch (err: any) {
      message.error(err || "Không thể gửi yêu cầu rút tiền");
    }
  };

  const topupColumns = [
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Số tiền (VND)",
      dataIndex: "amountVnd",
      key: "amountVnd",
      render: (val: number) => <Text strong>{val.toLocaleString()}₫</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: TopupStatusEnum) => {
        const color = TOPUP_STATUS_COLORS[status] || "default";
        const label = TOPUP_STATUS_LABELS[status] || status;
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Nội dung",
      dataIndex: "transferContent",
      key: "transferContent",
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: TopupResponseDto) => {
        if (record.status === TopupStatusEnum.Pending) {
          return (
            <Button 
              type="primary" 
              size="small" 
              onClick={() => handleZaloPayPayment(record.id)}
            >
              Thanh toán ZaloPay
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const withdrawColumns = [
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Số tiền (VND)",
      dataIndex: "amountVnd",
      key: "amountVnd",
      render: (val: number) => <Text strong>{val.toLocaleString()}₫</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: WithdrawStatusEnum) => {
        const color = WITHDRAW_STATUS_COLORS[status] || "default";
        const label = WITHDRAW_STATUS_LABELS[status] || status;
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
        title: "Ngân hàng",
        dataIndex: "bankName",
        key: "bankName",
        render: (_: any, record: any) => (
            <span>{record.bankName} - {record.bankAccountNo}</span>
        )
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Title level={2} className="!mb-0">Quản lý tài chính</Title>
        <Link to="/bank-accounts">
          <Button>Quản lý tài khoản ngân hàng</Button>
        </Link>
      </div>

      {error && <Alert message={error} type="error" showIcon className="mb-4" />}

      {bankAccounts.length === 0 && (
        <Alert 
          message="Chưa có tài khoản ngân hàng"
          description={
            <span>
              Bạn cần thêm tài khoản ngân hàng để thực hiện giao dịch nạp/rút tiền. <Link to="/bank-accounts">Thêm ngay</Link>
            </span>
          }
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Tổng số dư"
              value={wallet?.totalBalance || 0}
              precision={0}
              suffix="₫"
              prefix={<WalletOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Số dư khả dụng"
              value={wallet?.availableBalance || 0}
              precision={0}
              suffix="₫"
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Số dư đóng băng"
              value={wallet?.frozenBalance || 0}
              precision={0}
              suffix="₫"
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col lg={10} xs={24}>
          <Card className="shadow-sm">
            <Tabs defaultActiveKey="topup" items={[
              {
                key: "topup",
                label: (<span><ArrowUpOutlined /> Nạp tiền</span>),
                children: (
                  <Form form={topupForm} layout="vertical" onFinish={onTopupSubmit}>
                    <Form.Item
                      name="bankAccountId"
                      label="Tài khoản ngân hàng của hệ thống"
                      rules={TOPUP_RULES.bankAccountId}
                    >
                      <Select placeholder="Chọn tài khoản" disabled={activeSystemBankAccounts.length === 0}>
                        {activeSystemBankAccounts.map((b) => (
                          <Select.Option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNumber} ({b.accountHolder})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item 
                      name="amount" 
                      label="Số tiền muốn nạp" 
                      rules={TOPUP_RULES.amount}
                    >
                      <InputNumber
                        className="w-full"
                        step={50000}
                        formatter={numberFormatter}
                        parser={numberParser}
                        addonAfter="VND"
                      />
                    </Form.Item>
                    <Alert 
                      message="Lưu ý" 
                      description="Sau khi gửi yêu cầu, vui lòng thực hiện chuyển khoản theo nội dung hiển thị trong lịch sử."
                      type="info"
                      showIcon
                      className="mb-4"
                    />
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      block 
                      loading={status === ReduxStatus.LOADING}
                    >
                      Tạo yêu cầu nạp tiền
                    </Button>
                  </Form>
                )
              },
              {
                key: "withdraw",
                label: (<span><ArrowDownOutlined /> Rút tiền</span>),
                children: (
                  <Form form={withdrawForm} layout="vertical" onFinish={onWithdrawSubmit}>
                    <Form.Item
                      name="bankAccountId"
                      label="Tài khoản ngân hàng nhận tiền"
                      rules={WITHDRAW_RULES.bankAccountId}
                    >
                      <Select placeholder="Chọn tài khoản" disabled={activeBankAccounts.length === 0}>
                        {activeBankAccounts.map((b) => (
                          <Select.Option key={b.id} value={b.id}>
                            {b.bankName} - {b.accountNumber} ({b.accountHolder})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item 
                      name="amount" 
                      label="Số tiền muốn rút" 
                      rules={WITHDRAW_RULES.amount}
                    >
                      <InputNumber
                        className="w-full"
                        step={100000}
                        formatter={numberFormatter}
                        parser={numberParser}
                        addonAfter="VND"
                      />
                    </Form.Item>
                    <Text type="secondary" className="block mb-4">
                      Số dư khả dụng: {wallet?.availableBalance.toLocaleString()}₫
                    </Text>
                    <Button 
                      type="primary" 
                      danger 
                      htmlType="submit" 
                      block 
                      loading={status === ReduxStatus.LOADING}
                    >
                      Tạo yêu cầu rút tiền
                    </Button>
                  </Form>
                )
              }
            ]} />
          </Card>
        </Col>

        <Col lg={14} xs={24}>
          <Card 
            title={<span><HistoryOutlined /> Lịch sử giao dịch</span>} 
            className="shadow-sm"
          >
            <Tabs defaultActiveKey="topup-history" items={[
              {
                key: "topup-history",
                label: "Nạp tiền",
                children: (
                  <Table 
                    dataSource={topups} 
                    columns={topupColumns} 
                    rowKey="id" 
                    size="small"
                    pagination={{ pageSize: 5 }}
                  />
                )
              },
              {
                key: "withdraw-history",
                label: "Rút tiền",
                children: (
                  <Table 
                    dataSource={withdraws} 
                    columns={withdrawColumns} 
                    rowKey="id" 
                    size="small"
                    pagination={{ pageSize: 5 }}
                  />
                )
              }
            ]} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinancePage;
