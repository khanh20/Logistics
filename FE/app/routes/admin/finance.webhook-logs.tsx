import React, { useEffect } from "react";
import { Card, Table, Tag, Typography, Button, Space, Tooltip, Descriptions, Popover } from "antd";
import { SearchOutlined, ApiOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchWebhookLogs } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectWebhookLogs, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { WEBHOOK_PROCESSING_STATUS_LABELS } from "~/lib/constants/finance";
import { WebhookProcessingStatusEnum } from "~/lib/enums/finance";
import type { BankWebhookLogDto } from "~/lib/types/adminFinance";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const AdminWebhookLogsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const webhookLogs = useAppSelector(selectWebhookLogs);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  useEffect(() => {
    dispatch(fetchWebhookLogs());
  }, [dispatch]);

  const getStatusColor = (status?: WebhookProcessingStatusEnum) => {
    switch (status) {
      case WebhookProcessingStatusEnum.Matched: return "success";
      case WebhookProcessingStatusEnum.Unmatched: return "warning";
      case WebhookProcessingStatusEnum.Error:
      case WebhookProcessingStatusEnum.Failed: return "error";
      case WebhookProcessingStatusEnum.Ignored: return "default";
      default: return "processing";
    }
  };

  const columns = [
    {
      title: "Thời gian",
      dataIndex: "transactionDate",
      key: "transactionDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm:ss"),
      width: 160,
    },
    {
      title: "Trạng thái xử lý",
      dataIndex: "processingStatus",
      key: "processingStatus",
      width: 140,
      render: (statusValue?: WebhookProcessingStatusEnum) => (
        statusValue ? (
          <Tag color={getStatusColor(statusValue)}>
            {WEBHOOK_PROCESSING_STATUS_LABELS[statusValue]}
          </Tag>
        ) : <Tag>Chưa xử lý</Tag>
      )
    },
    {
      title: "Số tiền (VND)",
      dataIndex: "amountVnd",
      key: "amountVnd",
      render: (amount?: number) => amount ? (
        <Text strong className="text-green-600">+{amount.toLocaleString()}₫</Text>
      ) : "-",
    },
    {
      title: "Nội dung CK",
      dataIndex: "transferContent",
      key: "transferContent",
      ellipsis: true,
    },
    {
      title: "Tham chiếu NH",
      dataIndex: "bankRef",
      key: "bankRef",
    },
    {
      title: "Topup ID đã khớp",
      dataIndex: "matchedTopupId",
      key: "matchedTopupId",
      render: (id?: string) => id ? <Text copyable>{id}</Text> : "-",
    },
    {
      title: "Chi tiết Payload",
      key: "rawPayload",
      width: 120,
      render: (_: any, record: BankWebhookLogDto) => (
        <Popover
          title="Raw JSON Payload"
          content={
            <div className="max-w-md max-h-96 overflow-auto">
              <pre className="text-xs p-2 bg-gray-100 rounded">
                {record.rawPayload ? (
                  (() => {
                    try {
                      return JSON.stringify(JSON.parse(record.rawPayload), null, 2);
                    } catch {
                      return record.rawPayload;
                    }
                  })()
                ) : "Không có dữ liệu"}
              </pre>
            </div>
          }
          trigger="click"
        >
          <Button size="small" icon={<InfoCircleOutlined />}>Xem JSON</Button>
        </Popover>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space className="mb-6 w-full justify-between">
        <Title level={2} className="!mb-0">
          <ApiOutlined className="mr-2 text-blue-500" />
          Nhật ký Webhook Ngân hàng
        </Title>
        <Button icon={<SearchOutlined />} onClick={() => dispatch(fetchWebhookLogs())} type="primary" ghost>
          Làm mới
        </Button>
      </Space>

      <Card className="shadow-sm">
        <Table
          dataSource={webhookLogs}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
};

export default AdminWebhookLogsPage;
