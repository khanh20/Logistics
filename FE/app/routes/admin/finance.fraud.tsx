import React, { useEffect, useState } from "react";
import { 
  Card, Table, Tag, Typography, Button, Modal, Form, Select, Input, Space, message 
} from "antd";
import { WarningOutlined, SearchOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { fetchFraudCases, reviewFraudCase } from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectFraudCases, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { 
  FRAUD_STATUS_LABELS, 
  FRAUD_STATUS_COLORS, 
  FRAUD_TYPE_LABELS,
  FRAUD_ACTION_LABELS
} from "~/lib/constants/finance";
import { FraudStatusEnum } from "~/lib/enums/finance";
import type { FraudDetectionDto } from "~/lib/types/adminFinance";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const AdminFraudPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const fraudCases = useAppSelector(selectFraudCases);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCase, setSelectedCase] = useState<FraudDetectionDto | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchFraudCases());
  }, [dispatch]);

  const handleReview = (record: FraudDetectionDto) => {
    setSelectedCase(record);
    form.setFieldsValue({
      status: record.status,
      resolutionNote: record.resolutionNote
    });
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (values: any) => {
    if (!selectedCase) return;
    try {
      await dispatch(reviewFraudCase({ 
        id: selectedCase.id, 
        data: {
          status: values.status,
          resolutionNote: values.resolutionNote
        }
      })).unwrap();
      message.success("Cập nhật trạng thái thành công!");
      setIsModalVisible(false);
    } catch (err: any) {
      message.error(err || "Có lỗi xảy ra");
    }
  };

  const columns = [
    {
      title: "Mã KH",
      dataIndex: "customerId",
      key: "customerId",
    },
    {
      title: "Loại gian lận",
      dataIndex: "fraudType",
      key: "fraudType",
      render: (type: number) => type ? FRAUD_TYPE_LABELS[type as keyof typeof FRAUD_TYPE_LABELS] : "Không rõ"
    },
    {
      title: "Điểm rủi ro",
      dataIndex: "riskScore",
      key: "riskScore",
      render: (score: number) => (
        <span className={score > 80 ? "text-red-500 font-bold" : "text-yellow-600"}>
          {score}
        </span>
      )
    },
    {
      title: "Hành động hệ thống",
      dataIndex: "action",
      key: "action",
      render: (action: number) => action ? FRAUD_ACTION_LABELS[action as keyof typeof FRAUD_ACTION_LABELS] : "N/A"
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (statusValue: FraudStatusEnum) => (
        <Tag color={FRAUD_STATUS_COLORS[statusValue]}>
          {FRAUD_STATUS_LABELS[statusValue]}
        </Tag>
      )
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: FraudDetectionDto) => (
        <Button size="small" type="primary" onClick={() => handleReview(record)}>
          Kiểm tra
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space className="mb-6 w-full justify-between">
        <Title level={2} className="!mb-0">
          <WarningOutlined className="mr-2 text-red-500" />
          Phát hiện gian lận
        </Title>
        <Button icon={<SearchOutlined />} onClick={() => dispatch(fetchFraudCases())}>
          Làm mới
        </Button>
      </Space>

      <Card className="shadow-sm">
        <Table 
          dataSource={fraudCases} 
          columns={columns} 
          rowKey="id" 
          size="middle"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="Đánh giá gian lận"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p><strong>Mã khách hàng:</strong> {selectedCase?.customerId}</p>
            <p><strong>Điểm rủi ro:</strong> {selectedCase?.riskScore}</p>
            <p><strong>Ghi chú hệ thống:</strong> {selectedCase?.evidenceJson}</p>
          </div>

          <Form.Item 
            name="status" 
            label="Trạng thái xử lý" 
            rules={[{ required: true, message: "Vui lòng chọn trạng thái" }]}
          >
            <Select>
              <Option value={FraudStatusEnum.Open}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Open]}</Option>
              <Option value={FraudStatusEnum.Investigating}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Investigating]}</Option>
              <Option value={FraudStatusEnum.Confirmed}>{FRAUD_STATUS_LABELS[FraudStatusEnum.Confirmed]}</Option>
              <Option value={FraudStatusEnum.FalsePositive}>{FRAUD_STATUS_LABELS[FraudStatusEnum.FalsePositive]}</Option>
            </Select>
          </Form.Item>

          <Form.Item name="resolutionNote" label="Ghi chú giải quyết">
            <TextArea rows={4} placeholder="Nhập ghi chú chi tiết về cách giải quyết..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminFraudPage;
