import React, { useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Button,
  Typography,
  Spin,
} from "antd";
import {
  BankOutlined,
  AlertOutlined,
  UndoOutlined,
  ReconciliationOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router";
import dayjs from "dayjs";

import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchPendingWithdraws,
  fetchRefunds,
  fetchFraudCases,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  WithdrawStatusEnum,
  RefundStatusEnum,
  FraudStatusEnum,
  FraudActionEnum,
  FraudTypeEnum,
} from "~/lib/enums/finance";
import {
  WITHDRAW_STATUS_LABELS,
  WITHDRAW_STATUS_COLORS,
  FRAUD_STATUS_LABELS,
  FRAUD_STATUS_COLORS,
  FRAUD_TYPE_LABELS,
  FRAUD_ACTION_LABELS,
} from "~/lib/constants/finance";
import type { WithdrawResponseDto } from "~/lib/types/finance";
import type { FraudDetectionDto } from "~/lib/types/adminFinance";
import { ReduxStatus } from "~/lib/feature/const";

const { Title, Text } = Typography;

export default function AdminFinanceDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { pendingWithdraws, refunds, fraudCases, status } = useAppSelector(
    (state) => state.adminFinanceState
  );

  useEffect(() => {
    dispatch(fetchPendingWithdraws());
    dispatch(fetchRefunds());
    dispatch(fetchFraudCases());
  }, [dispatch]);

  // Derived stats
  const pendingWithdrawCount = useMemo(() => {
    return pendingWithdraws.filter((w) => w.status === WithdrawStatusEnum.Pending).length;
  }, [pendingWithdraws]);

  const pendingRefundCount = useMemo(() => {
    return refunds.filter((r) => r.status === RefundStatusEnum.Pending).length;
  }, [refunds]);

  const openFraudCount = useMemo(() => {
    return fraudCases.filter(
      (f) =>
        f.status === FraudStatusEnum.Open ||
        f.status === FraudStatusEnum.Investigating
    ).length;
  }, [fraudCases]);

  // Tables Columns
  const withdrawColumns = [
    {
      title: "Mã GD",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text copyable>{id.substring(0, 8)}</Text>,
    },
    {
      title: "Khách hàng",
      dataIndex: "accountHolder",
      key: "accountHolder",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Số tiền",
      dataIndex: "amountVnd",
      key: "amountVnd",
      render: (val: number) => (val ? `${val.toLocaleString()} ₫` : "-"),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusVal: WithdrawStatusEnum) => (
        <Tag color={WITHDRAW_STATUS_COLORS[statusVal]}>
          {WITHDRAW_STATUS_LABELS[statusVal]}
        </Tag>
      ),
    },
  ];

  const fraudColumns = [
    {
      title: "Mã KH",
      dataIndex: "customerId",
      key: "customerId",
      render: (id: string) => <Text copyable>{id.substring(0, 8)}</Text>,
    },
    {
      title: "Loại vi phạm",
      dataIndex: "fraudType",
      key: "fraudType",
      render: (type: FraudTypeEnum) => FRAUD_TYPE_LABELS[type] || "Khác",
    },
    {
      title: "Điểm rủi ro",
      dataIndex: "riskScore",
      key: "riskScore",
      render: (score: number) => (
        <Text type={score > 80 ? "danger" : score > 50 ? "warning" : "secondary"}>
          {score}
        </Text>
      ),
    },
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      render: (action: FraudActionEnum) => (
        <Tag>{FRAUD_ACTION_LABELS[action] || "Không xác định"}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusVal: FraudStatusEnum) => (
        <Tag color={FRAUD_STATUS_COLORS[statusVal]}>
          {FRAUD_STATUS_LABELS[statusVal]}
        </Tag>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="!mb-1">Tổng quan Tài chính</Title>
          <Text type="secondary">Quản lý giao dịch, đối soát và các vấn đề bất thường</Text>
        </div>
      </div>

      <Spin spinning={status === ReduxStatus.LOADING}>
        {/* KPI Cards */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="h-full shadow-sm">
              <Statistic
                title={<Text className="text-gray-500 font-medium">Yêu cầu rút tiền</Text>}
                value={pendingWithdrawCount}
                prefix={<BankOutlined className="text-blue-500 mr-2" />}
                valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                suffix={<Text className="text-sm text-gray-400">cần duyệt</Text>}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Link to="/admin/finance/withdraws" className="text-blue-500 hover:text-blue-600 text-sm flex items-center">
                  Xem chi tiết <ArrowRightOutlined className="ml-1 text-xs" />
                </Link>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="h-full shadow-sm">
              <Statistic
                title={<Text className="text-gray-500 font-medium">Yêu cầu hoàn tiền</Text>}
                value={pendingRefundCount}
                prefix={<UndoOutlined className="text-orange-500 mr-2" />}
                valueStyle={{ color: '#fa8c16', fontWeight: 600 }}
                suffix={<Text className="text-sm text-gray-400">cần xử lý</Text>}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Link to="/admin/finance/refunds" className="text-orange-500 hover:text-orange-600 text-sm flex items-center">
                  Xem chi tiết <ArrowRightOutlined className="ml-1 text-xs" />
                </Link>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card hoverable className="h-full shadow-sm">
              <Statistic
                title={<Text className="text-gray-500 font-medium">Cảnh báo gian lận</Text>}
                value={openFraudCount}
                prefix={<AlertOutlined className="text-red-500 mr-2" />}
                valueStyle={{ color: '#f5222d', fontWeight: 600 }}
                suffix={<Text className="text-sm text-gray-400">chưa giải quyết</Text>}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Link to="/admin/finance/fraud" className="text-red-500 hover:text-red-600 text-sm flex items-center">
                  Xem chi tiết <ArrowRightOutlined className="ml-1 text-xs" />
                </Link>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card className="h-full bg-gradient-to-br from-indigo-50 to-blue-50 border-none shadow-sm flex flex-col justify-center items-center">
              <ReconciliationOutlined className="text-4xl text-indigo-500 mb-3 mt-2" />
              <Title level={5} className="!mb-1 !mt-0 !text-indigo-900">Đối soát nền tảng</Title>
              <Text className="text-indigo-600/80 mb-4 text-center text-sm px-2">
                Đồng bộ và kiểm tra dữ liệu tài chính với hệ thống đối tác
              </Text>
              <Button
                type="primary"
                className="w-full bg-indigo-500 hover:bg-indigo-600 border-none"
                onClick={() => navigate("/admin/finance/reconcile")}
              >
                Thực hiện đối soát
              </Button>
            </Card>
          </Col>
        </Row>

        {/* Tables */}
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={12}>
            <Card
              title={
                <div className="flex items-center">
                  <BankOutlined className="mr-2 text-blue-500" />
                  <span>Rút tiền gần đây</span>
                </div>
              }
              extra={<Link to="/admin/finance/withdraws">Tất cả</Link>}
              className="shadow-sm"
              styles={{ body: { padding: 0 } }}
            >
              <Table<WithdrawResponseDto>
                columns={withdrawColumns}
                dataSource={pendingWithdraws.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card
              title={
                <div className="flex items-center">
                  <AlertOutlined className="mr-2 text-red-500" />
                  <span>Cảnh báo gian lận mới</span>
                </div>
              }
              extra={<Link to="/admin/finance/fraud">Tất cả</Link>}
              className="shadow-sm"
              styles={{ body: { padding: 0 } }}
            >
              <Table<FraudDetectionDto>
                columns={fraudColumns}
                dataSource={fraudCases.filter(f => f.status === FraudStatusEnum.Open || f.status === FraudStatusEnum.Investigating).slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}
