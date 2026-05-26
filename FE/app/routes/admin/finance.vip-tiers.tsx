import React, { useEffect, useState } from "react";
import {
  Card, Table, Typography, Button, Modal, Form, Input, Space, message, Popconfirm, InputNumber, Switch
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchVipTiers,
  createVipTier,
  updateVipTier,
  deleteVipTier
} from "~/lib/feature/adminFinance/adminFinanceThunk";
import { selectVipTiers, selectAdminFinanceStatus } from "~/lib/feature/adminFinance/adminFinanceSelector";
import { ReduxStatus } from "~/lib/feature/const";
import { VIP_TIER_RULES } from "~/lib/validations/finance";
import type { VipTierDto, CreateVipTierDto } from "~/lib/types/adminFinance";

const { Title, Text } = Typography;

const AdminVipTiersPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const vipTiers = useAppSelector(selectVipTiers);
  const status = useAppSelector(selectAdminFinanceStatus);
  const loading = status === ReduxStatus.LOADING;

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTier, setEditingTier] = useState<VipTierDto | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchVipTiers());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingTier(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: VipTierDto) => {
    setEditingTier(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteVipTier(id)).unwrap();
      message.success("Xóa hạng VIP thành công!");
    } catch (err: any) {
      message.error(err || "Không thể xóa hạng VIP");
    }
  };

  const handleModalSubmit = async (values: CreateVipTierDto) => {
    try {
      if (editingTier) {
        await dispatch(updateVipTier({ id: editingTier.id, data: values })).unwrap();
        message.success("Cập nhật hạng VIP thành công!");
      } else {
        await dispatch(createVipTier(values)).unwrap();
        message.success("Tạo hạng VIP mới thành công!");
      }
      setIsModalVisible(false);
    } catch (err: any) {
      message.error(err || "Có lỗi xảy ra");
    }
  };

  const columns = [
    {
      title: "Hạng VIP",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: VipTierDto) => (
        <Space>
          {record.colorHex && (
            <div
              className="w-4 h-4 rounded-full border border-gray-200"
              style={{ backgroundColor: record.colorHex.startsWith('#') ? record.colorHex : `#${record.colorHex}` }}
            />
          )}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "level",
      key: "level",
    },
    {
      title: "Chi tiêu tối thiểu (VND)",
      dataIndex: "minSpendVnd",
      key: "minSpendVnd",
      render: (val: number) => val.toLocaleString() + "₫",
    },
    {
      title: "Giảm phí DV (%)",
      dataIndex: "serviceFeeDiscountPct",
      key: "serviceFeeDiscountPct",
      render: (val: number) => `${val}%`,
    },
    {
      title: "Ưu đãi",
      key: "perks",
      render: (_: any, record: VipTierDto) => (
        <Space size="small" direction="vertical">
          {record.freeInspection && <Text type="success" className="text-xs">• Miễn phí kiểm đếm</Text>}
          {record.prioritySupport && <Text type="success" className="text-xs">• CSKH Ưu tiên</Text>}
          {record.freeStorageDays > 0 && <Text type="success" className="text-xs">• Lưu kho miễn phí {record.freeStorageDays} ngày</Text>}
        </Space>
      ),
    },
    {
      title: "Hoàn tiền (%)",
      dataIndex: "cashbackPct",
      key: "cashbackPct",
      render: (val: number) => `${val}%`,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: VipTierDto) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Xóa hạng VIP này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space className="mb-6 w-full justify-between">
        <Title level={2} className="!mb-0">
          <StarOutlined className="mr-2 text-yellow-500" />
          Quản lý Hạng VIP
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Thêm hạng VIP
        </Button>
      </Space>

      <Card className="shadow-sm">
        <Table
          dataSource={vipTiers}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingTier ? "Chỉnh sửa hạng VIP" : "Thêm hạng VIP mới"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit} className="mt-4">
          <Space size="large" className="w-full flex" align="start">
            <Form.Item name="name" label="Tên hạng VIP" rules={VIP_TIER_RULES.name} className="flex-1">
              <Input placeholder="VD: Bạc, Vàng, Kim Cương" />
            </Form.Item>
            <Form.Item name="level" label="Cấp độ (1, 2, 3...)" rules={VIP_TIER_RULES.level}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </Space>

          <Space size="large" className="w-full flex" align="start">
            <Form.Item name="minSpendVnd" label="Mức chi tiêu tối thiểu (VND)" rules={VIP_TIER_RULES.minSpendVnd} className="flex-1">
              <InputNumber
                min={0}
                className="w-full"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as any}
                addonAfter="₫"
              />
            </Form.Item>
            <Form.Item name="colorHex" label="Mã màu (Hex)" rules={VIP_TIER_RULES.colorHex}>
              <Input placeholder="#FFD700" />
            </Form.Item>
          </Space>

          <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-100">
            <Text strong className="block mb-4">Các ưu đãi</Text>

            <Space size="large" className="w-full flex" align="start">
              <Form.Item name="serviceFeeDiscountPct" label="Giảm phí dịch vụ (%)" className="flex-1">
                <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
              </Form.Item>
              <Form.Item name="cashbackPct" label="Tỷ lệ hoàn tiền (%)" className="flex-1">
                <InputNumber min={0} max={100} className="w-full" addonAfter="%" />
              </Form.Item>
            </Space>

            <Form.Item name="depositPctOverride" label="Tỷ lệ đặt cọc riêng (%)">
              <InputNumber min={0} max={100} className="w-full" addonAfter="%" placeholder="Để trống nếu theo mặc định" />
            </Form.Item>

            <Space size="large" className="w-full flex flex-wrap" align="start">
              <Form.Item name="freeInspection" valuePropName="checked" label="Miễn phí kiểm đếm">
                <Switch />
              </Form.Item>
              <Form.Item name="prioritySupport" valuePropName="checked" label="CSKH Ưu tiên">
                <Switch />
              </Form.Item>
              <Form.Item name="freeStorageDays" label="Lưu kho miễn phí (ngày)">
                <InputNumber min={0} />
              </Form.Item>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminVipTiersPage;
