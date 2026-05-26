import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Form,
  Modal,
  Button,
  Tag,
  message,
  Select,
  InputNumber,
  DatePicker,
  Space,
  Row,
  Col,
  Typography,
  Input,
  Switch,
  Popconfirm,
} from "antd";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  fetchVipTiers,
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import {
  selectFeeRules,
  selectVipTiers,
  selectAdminFinanceStatus,
} from "~/lib/feature/adminFinance/adminFinanceSelector";
import dayjs from "dayjs";
import type { FeeRuleDto, CreateFeeRuleDto } from "~/lib/types/adminFinance";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function AdminFeeRulesPage() {
  const dispatch = useAppDispatch();
  const feeRules = useAppSelector(selectFeeRules);
  const vipTiers = useAppSelector(selectVipTiers);
  const status = useAppSelector(selectAdminFinanceStatus);
  const isLoading = status === "loading";

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<FeeRuleDto | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchFeeRules());
    dispatch(fetchVipTiers());
  }, [dispatch]);

  const handleOpenModal = (rule?: FeeRuleDto) => {
    if (rule) {
      setEditingRule(rule);
      form.setFieldsValue({
        ...rule,
        effectiveFrom: dayjs(rule.effectiveFrom),
        effectiveTo: rule.effectiveTo ? dayjs(rule.effectiveTo) : undefined,
      });
    } else {
      setEditingRule(null);
      form.resetFields();
      form.setFieldsValue({
        isActive: true,
        effectiveFrom: dayjs(),
      });
    }
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingRule(null);
    form.resetFields();
  };

  const handleSave = async (values: any) => {
    try {
      const payload: CreateFeeRuleDto = {
        ...values,
        effectiveFrom: values.effectiveFrom.format("YYYY-MM-DD"),
        effectiveTo: values.effectiveTo ? values.effectiveTo.format("YYYY-MM-DD") : undefined,
      };

      if (editingRule) {
        await dispatch(updateFeeRule({ id: editingRule.id, data: payload })).unwrap();
        message.success("Cập nhật quy tắc phí thành công");
      } else {
        await dispatch(createFeeRule(payload)).unwrap();
        message.success("Thêm quy tắc phí mới thành công");
      }
      handleCloseModal();
      dispatch(fetchFeeRules());
    } catch (error: any) {
      message.error(error || "Có lỗi xảy ra khi lưu quy tắc phí");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteFeeRule(id)).unwrap();
      message.success("Xóa quy tắc phí thành công");
      dispatch(fetchFeeRules());
    } catch (error: any) {
      message.error(error || "Có lỗi xảy ra khi xóa quy tắc phí");
    }
  };

  const columns: ColumnsType<FeeRuleDto> = [
    {
      title: "Tên quy tắc",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "Hạng VIP",
      dataIndex: "vipTierId",
      key: "vipTierId",
      render: (vipTierId: string) => {
        if (!vipTierId) return <Text type="secondary">Mặc định</Text>;
        const tier = vipTiers.find((t) => t.id === vipTierId);
        return tier ? <Tag color={tier.colorHex || "blue"}>{tier.name}</Tag> : vipTierId;
      },
    },
    {
      title: "Phí dịch vụ (%)",
      dataIndex: "serviceFeePct",
      key: "serviceFeePct",
      align: "right",
    },
    {
      title: "VCQT (đ/kg)",
      dataIndex: "intlShipPerKgVnd",
      key: "intlShipPerKgVnd",
      align: "right",
      render: (val: number) => `${val.toLocaleString()} ₫`,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      align: "center",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"}>{isActive ? "Hoạt động" : "Tạm ngưng"}</Tag>
      ),
    },
    {
      title: "Hiệu lực từ",
      dataIndex: "effectiveFrom",
      key: "effectiveFrom",
      render: (val: string) => dayjs(val).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<FaEdit />} onClick={() => handleOpenModal(record)} />
          <Popconfirm
            title="Xóa quy tắc phí"
            description="Bạn có chắc chắn muốn xóa quy tắc này không?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<FaTrash />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="!mb-0">
            Quản Lý Quy Tắc Phí
          </Title>
          <Text type="secondary">Cấu hình các loại phí dịch vụ, vận chuyển, kiểm đếm và bảo hiểm</Text>
        </div>
        <Button type="primary" icon={<FaPlus />} onClick={() => handleOpenModal()}>
          Thêm quy tắc mới
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={feeRules}
          rowKey="id"
          loading={isLoading}
          size="middle"
          pagination={{
            showSizeChanger: true,
            defaultPageSize: 10,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingRule ? "Cập Nhật Quy Tắc Phí" : "Thêm Quy Tắc Phí Mới"}
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
        destroyOnClose
        style={{ top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="Tên quy tắc"
                rules={[{ required: true, message: "Vui lòng nhập tên quy tắc" }]}
              >
                <Input placeholder="VD: Phí vận chuyển tiêu chuẩn 2026" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="vipTierId" label="Áp dụng cho Hạng VIP">
                <Select placeholder="Chọn hạng VIP (bỏ trống = Tất cả)" allowClear>
                  {vipTiers.map((tier) => (
                    <Select.Option key={tier.id} value={tier.id}>
                      {tier.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="platformId" label="ID Nền tảng (Platform)">
                <Input placeholder="Bỏ trống = Tất cả" />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="serviceFeePct"
                label={<span className="flex items-end min-h-[44px]">Phí dịch vụ (%)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="intlShipPerKgVnd"
                label={<span className="flex items-end min-h-[44px]">Phí VCQT (VNĐ/kg)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(val) => val!.replace(/\$\s?|(,*)/g, "") as any}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="intlShipVolDivisor"
                label={<span className="flex items-end min-h-[44px]">Hệ số chia thể tích (VCQT)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="minChargeKg"
                label={<span className="flex items-end min-h-[44px]">Khối lượng tính phí tối thiểu (kg)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={0} step={0.1} />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="inspectionFeePct"
                label={<span className="flex items-end min-h-[44px]">Phí kiểm đếm (%)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="inspectionMinVnd"
                label={<span className="flex items-end min-h-[44px]">Phí kiểm đếm tối thiểu (VNĐ)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(val) => val!.replace(/\$\s?|(,*)/g, "") as any}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="inspectionMaxVnd"
                label={<span className="flex items-end min-h-[44px]">Phí kiểm đếm tối đa (VNĐ)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1000}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(val) => val!.replace(/\$\s?|(,*)/g, "") as any}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="storageDailyPerKgVnd"
                label={<span className="flex items-end min-h-[44px]">Phí lưu kho (VNĐ/kg/ngày)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={100}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(val) => val!.replace(/\$\s?|(,*)/g, "") as any}
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="insuranceBasicPct"
                label={<span className="flex items-end min-h-[44px]">Phí bảo hiểm cơ bản (%)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="insuranceFullPct"
                label={<span className="flex items-end min-h-[44px]">Phí bảo hiểm toàn diện (%)</span>}
                rules={[{ required: true, message: "Vui lòng nhập" }]}
              >
                <InputNumber className="w-full" min={0} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12} />

            <Col span={12}>
              <Form.Item
                name="effectiveFrom"
                label="Hiệu lực từ"
                rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu" }]}
              >
                <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveTo" label="Hiệu lực đến (Tùy chọn)">
                <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={handleCloseModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              {editingRule ? "Lưu Thay Đổi" : "Tạo Mới"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
