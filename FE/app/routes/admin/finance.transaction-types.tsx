import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Typography,
  message,
  Popconfirm,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import { adminFinanceApi } from "~/lib/api/adminFinance";
import { TransactionDirectionEnum } from "~/lib/enums/finance";
import { TRANSACTION_DIRECTION_COLORS, TRANSACTION_DIRECTION_LABELS } from "~/lib/constants/finance";
import { TRANSACTION_TYPE_RULES } from "~/lib/validations/finance";
import type {
  TransactionTypeDto,
} from "~/lib/types/adminFinance";

const { Title } = Typography;

export default function AdminTransactionTypesPage() {
  const [data, setData] = useState<TransactionTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchTransactionTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFinanceApi.getAllTransactionTypes();
      if (res.success) {
        setData(res.data || []);
      }
    } catch (error) {
      message.error("Lỗi khi tải danh sách loại giao dịch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactionTypes();
  }, [fetchTransactionTypes]);

  const handleOpenModal = (record?: TransactionTypeDto) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await adminFinanceApi.updateTransactionType(editingId, { ...values, id: editingId });
        message.success("Cập nhật loại giao dịch thành công");
      } else {
        await adminFinanceApi.createTransactionType(values);
        message.success("Thêm loại giao dịch thành công");
      }
      handleCloseModal();
      fetchTransactionTypes();
    } catch (error) {
      if (error && typeof error === "object" && "errorFields" in error) {
        return;
      }
      message.error("Có lỗi xảy ra, vui lòng thử lại");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminFinanceApi.deleteTransactionType(id);
      message.success("Xóa loại giao dịch thành công");
      fetchTransactionTypes();
    } catch (error) {
      message.error("Lỗi khi xóa loại giao dịch");
    }
  };

  const columns = [
    {
      title: "Mã loại",
      dataIndex: "code",
      key: "code",
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: "Tên loại",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: "Chiều giao dịch",
      dataIndex: "direction",
      key: "direction",
      render: (direction?: TransactionDirectionEnum) => {
        if (!direction) return <Tag>Không có</Tag>;
        return (
          <Tag color={TRANSACTION_DIRECTION_COLORS[direction]}>
            {TRANSACTION_DIRECTION_LABELS[direction]}
          </Tag>
        );
      },
    },
    {
      title: "Có thể hoàn tác",
      dataIndex: "isReversible",
      key: "isReversible",
      render: (isReversible: boolean) => (
        <Tag color={isReversible ? "green" : "default"}>
          {isReversible ? "Có" : "Không"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: TransactionTypeDto) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa?"
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
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!mb-0">Quản lý loại giao dịch</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTransactionTypes}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Thêm mới
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm" bordered={false}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `Tổng số ${total} bản ghi`,
          }}
        />
      </Card>

      <Modal
        title={editingId ? "Cập nhật loại giao dịch" : "Thêm loại giao dịch"}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        destroyOnClose
        okText={editingId ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="code" label="Mã loại giao dịch" rules={TRANSACTION_TYPE_RULES.code}>
            <Input placeholder="Nhập mã (VD: DEPOSIT, WITHDRAW)" />
          </Form.Item>
          <Form.Item name="name" label="Tên loại giao dịch" rules={TRANSACTION_TYPE_RULES.name}>
            <Input placeholder="Nhập tên" />
          </Form.Item>
          <Form.Item name="direction" label="Chiều giao dịch">
            <Select placeholder="Chọn chiều giao dịch" allowClear>
              {Object.entries(TRANSACTION_DIRECTION_LABELS).map(([value, label]) => (
                <Select.Option key={value} value={Number(value)}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isReversible" label="Có thể hoàn tác" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
