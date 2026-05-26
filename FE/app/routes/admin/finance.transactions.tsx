import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Card,
  Input,
  DatePicker,
  Button,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Statistic,
} from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchWalletTransactions } from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectWalletTransactions,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import {
  TRANSACTION_DIRECTION_COLORS,
} from "~/lib/constants/finance";
import { TransactionDirectionEnum } from "~/lib/enums/finance";
import { ReduxStatus } from "~/lib/feature/const";
import type { WalletTransactionDto } from "~/lib/types/adminFinance";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AdminFinanceTransactionsPage() {
  const dispatch = useAppDispatch();
  const transactions = useAppSelector(selectWalletTransactions);
  const status = useAppSelector(selectAdminFinanceStatus);

  const [walletIdFilter, setWalletIdFilter] = useState("");
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);

  useEffect(() => {
    dispatch(fetchWalletTransactions());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchWalletTransactions());
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      let matchesWalletId = true;
      if (walletIdFilter) {
        matchesWalletId = t.walletId
          .toLowerCase()
          .includes(walletIdFilter.toLowerCase());
      }
      let matchesDate = true;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const tDate = dayjs(t.createdDate);
        matchesDate =
          tDate.isAfter(dateRange[0].startOf("day")) &&
          tDate.isBefore(dateRange[1].endOf("day"));
      }
      return matchesWalletId && matchesDate;
    });
  }, [transactions, walletIdFilter, dateRange]);

  const columns = [
    {
      title: "Mã giao dịch",
      dataIndex: "id",
      key: "id",
      render: (id: string) => <Text copyable={{ text: id }}>{id.substring(0, 8)}...</Text>,
    },
    {
      title: "Mã ví (Wallet ID)",
      dataIndex: "walletId",
      key: "walletId",
      render: (walletId: string) => (
        <Text copyable={{ text: walletId }}>{walletId.substring(0, 8)}...</Text>
      ),
    },
    {
      title: "Loại giao dịch",
      dataIndex: "typeName",
      key: "typeName",
      render: (text: string) => <Text strong>{text || "Không xác định"}</Text>,
    },
    {
      title: "Số tiền",
      key: "amount",
      render: (_: any, record: WalletTransactionDto) => {
        const isCredit = record.balanceAfter >= record.balanceBefore;
        const direction = isCredit
          ? TransactionDirectionEnum.Credit
          : TransactionDirectionEnum.Debit;

        return (
          <Tag color={TRANSACTION_DIRECTION_COLORS[direction]}>
            {isCredit ? "+" : "-"}
            {record.amount.toLocaleString()} ₫
          </Tag>
        );
      },
    },
    {
      title: "Số dư trước",
      dataIndex: "balanceBefore",
      key: "balanceBefore",
      render: (val: number) => `${val.toLocaleString()} ₫`,
    },
    {
      title: "Số dư sau",
      dataIndex: "balanceAfter",
      key: "balanceAfter",
      render: (val: number) => <Text strong>{val.toLocaleString()} ₫</Text>,
    },
    {
      title: "Tham chiếu",
      key: "reference",
      render: (_: any, record: WalletTransactionDto) => (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.referenceType}
          </Text>
          <Text>{record.referenceId}</Text>
        </Space>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space direction="vertical" size="large" className="w-full">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Giao dịch ví điện tử
            </Title>
            <Text type="secondary">
              Quản lý và tra cứu lịch sử giao dịch của tất cả ví khách hàng
            </Text>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={status === ReduxStatus.LOADING}
            >
              Làm mới
            </Button>
          </Col>
        </Row>

        <Card bordered={false} className="shadow-sm">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="Tổng số giao dịch"
                value={filteredTransactions.length}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
            <Col xs={24} sm={12} md={16}>
              <div className="flex justify-end items-end h-full gap-4">
                <Input
                  placeholder="Lọc theo Wallet ID"
                  prefix={<SearchOutlined />}
                  value={walletIdFilter}
                  onChange={(e) => setWalletIdFilter(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
                <RangePicker
                  value={dateRange as any}
                  onChange={(dates) =>
                    setDateRange(
                      dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
                    )
                  }
                  style={{ width: 300 }}
                  placeholder={["Từ ngày", "Đến ngày"]}
                  format="DD/MM/YYYY"
                />
              </div>
            </Col>
          </Row>
        </Card>

        <Card bordered={false} className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredTransactions}
            loading={status === ReduxStatus.LOADING}
            size="middle"
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} giao dịch`,
            }}
          />
        </Card>
      </Space>
    </div>
  );
}
