import { useState, useEffect } from "react";
import { 
  Table, Card, Button, Modal, Form, 
  InputNumber, DatePicker, Space, Tag, Typography, message, 
  Popconfirm, Input, Row, Col 
} from "antd";
import { PlusOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { 
  fetchReconciles, 
  createReconcile, 
  confirmReconcile 
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { 
  selectReconciles, 
  selectAdminFinanceStatus 
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import { 
  RECONCILE_STATUS_COLORS, 
  RECONCILE_STATUS_LABELS 
} from "~/lib/constants/finance";
import { ReconcileStatusEnum } from "~/lib/enums/finance";
import dayjs from "dayjs";
import type { PlatformReconcileDto } from "~/lib/types/adminFinance";
import { ReduxStatus } from "~/lib/feature/const";

const { Title, Text } = Typography;

export default function ReconcilePage() {
  const dispatch = useAppDispatch();
  const reconciles = useAppSelector(selectReconciles);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchReconciles());
  }, [dispatch]);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        reconcileDate: values.reconcileDate.toISOString(),
        platformId: values.platformId,
        platformAccountId: values.platformAccountId,
        cnySpent: values.cnySpent,
        vndEquivalent: values.vndEquivalent,
        serviceFeeCollectedVnd: values.serviceFeeCollectedVnd,
        alipayStatementUrl: values.alipayStatementUrl,
        notes: values.notes,
      };

      await dispatch(createReconcile(payload)).unwrap();
      message.success("Tạo đối soát thành công!");
      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchReconciles());
    } catch (error: any) {
      message.error(error || "Có lỗi xảy ra khi tạo đối soát");
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await dispatch(confirmReconcile(id)).unwrap();
      message.success("Đã xác nhận khớp đối soát!");
    } catch (error: any) {
      message.error(error || "Lỗi khi xác nhận đối soát");
    }
  };

  const columns = [
    {
      title: "Ngày đối soát",
      dataIndex: "reconcileDate",
      key: "reconcileDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Nền tảng",
      dataIndex: "platformId",
      key: "platformId",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Tài khoản",
      dataIndex: "platformAccountId",
      key: "platformAccountId",
    },
    {
      title: "Chi tiêu CNY",
      dataIndex: "cnySpent",
      key: "cnySpent",
      render: (val: number) => (val != null ? val.toLocaleString() + " ¥" : "-"),
    },
    {
      title: "Tương đương VND",
      dataIndex: "vndEquivalent",
      key: "vndEquivalent",
      render: (val: number) => (val != null ? val.toLocaleString() + " ₫" : "-"),
    },
    {
      title: "Phí dịch vụ VND",
      dataIndex: "serviceFeeCollectedVnd",
      key: "serviceFeeCollectedVnd",
      render: (val: number) => (val != null ? val.toLocaleString() + " ₫" : "-"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: ReconcileStatusEnum) => (
        <Tag color={RECONCILE_STATUS_COLORS[status] || "default"}>
          {RECONCILE_STATUS_LABELS[status] || status}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: PlatformReconcileDto) => (
        <Space>
          {record.status === ReconcileStatusEnum.Pending && (
            <Popconfirm
              title="Xác nhận khớp đối soát này?"
              onConfirm={() => handleConfirm(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button type="primary" size="small" icon={<CheckCircleOutlined />}>
                Xác nhận khớp
              </Button>
            </Popconfirm>
          )}
          {record.alipayStatementUrl && (
            <Button 
              type="link" 
              size="small" 
              href={record.alipayStatementUrl} 
              target="_blank"
            >
              Xem sao kê
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card 
        title={<Title level={4} className="!mb-0">Quản lý đối soát nền tảng</Title>}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
          >
            Tạo đối soát mới
          </Button>
        }
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={reconciles}
          rowKey="id"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
          size="middle"
        />
      </Card>

      <Modal
        title="Tạo đối soát mới"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="reconcileDate"
                label="Ngày đối soát"
                rules={[{ required: true, message: "Vui lòng chọn ngày" }]}
              >
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="platformId"
                label="Mã nền tảng"
                rules={[{ required: true, message: "Vui lòng nhập nền tảng" }]}
              >
                <Input placeholder="VD: 1688, Taobao..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="platformAccountId"
                label="Tài khoản nền tảng"
                rules={[{ required: true, message: "Vui lòng nhập tài khoản" }]}
              >
                <Input placeholder="Tài khoản mua hàng..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="alipayStatementUrl"
                label="Đường dẫn sao kê"
              >
                <Input placeholder="URL file sao kê..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="cnySpent"
                label="Chi tiêu CNY"
                rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
              >
                <InputNumber<number>
                  className="w-full" 
                  min={0} 
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vndEquivalent"
                label="Tương đương VND"
                rules={[{ required: true, message: "Vui lòng nhập số lượng" }]}
              >
                <InputNumber<number>
                  className="w-full" 
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="serviceFeeCollectedVnd"
                label="Phí dịch vụ VND"
                rules={[{ required: true, message: "Vui lòng nhập phí dịch vụ" }]}
              >
                <InputNumber<number>
                  className="w-full" 
                  min={0}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="notes"
                label="Ghi chú"
              >
                <Input.TextArea rows={3} placeholder="Ghi chú thêm nếu có..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="text-right mb-0 mt-4">
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Tạo đối soát
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
