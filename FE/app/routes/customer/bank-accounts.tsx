import { useEffect, useState } from "react";
import { 
  Table, Card, Button, Modal, Form, Input, 
  Switch, Popconfirm, message, Typography, Space 
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { 
  fetchMyBankAccounts, 
  createMyBankAccount, 
  toggleMyBankAccountStatus, 
  deleteMyBankAccount 
} from "~/lib/feature/finance/financeThunk";
import { selectBankAccounts, selectFinanceStatus } from "~/lib/feature/finance/financeSelector";
import { BANK_ACCOUNT_RULES } from "~/lib/validations/finance";
import type { CreateBankAccountDto, BankAccountDto } from "~/lib/types/bankAccount";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

export default function CustomerBankAccountsPage() {
  const dispatch = useAppDispatch();
  const bankAccounts = useAppSelector(selectBankAccounts);
  const status = useAppSelector(selectFinanceStatus);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm<CreateBankAccountDto>();

  useEffect(() => {
    dispatch(fetchMyBankAccounts());
  }, [dispatch]);

  const handleCreate = async (values: CreateBankAccountDto) => {
    try {
      setIsSubmitting(true);
      await dispatch(createMyBankAccount(values)).unwrap();
      message.success("Thêm tài khoản ngân hàng thành công");
      setIsModalVisible(false);
      form.resetFields();
      dispatch(fetchMyBankAccounts());
    } catch (error: any) {
      message.error(error || "Thêm tài khoản thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, checked: boolean) => {
    try {
      await dispatch(toggleMyBankAccountStatus(id)).unwrap();
      message.success(`Đã ${checked ? "kích hoạt" : "vô hiệu hóa"} tài khoản`);
      dispatch(fetchMyBankAccounts());
    } catch (error: any) {
      message.error(error || "Thay đổi trạng thái thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteMyBankAccount(id)).unwrap();
      message.success("Xóa tài khoản thành công");
      dispatch(fetchMyBankAccounts());
    } catch (error: any) {
      message.error(error || "Xóa tài khoản thất bại");
    }
  };

  const columns: ColumnsType<BankAccountDto> = [
    {
      title: "Ngân hàng",
      dataIndex: "bankName",
      key: "bankName",
      render: (text, record) => (
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
      render: (text) => <Text copyable>{text}</Text>,
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
      render: (text) => text || <Text type="secondary">---</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      align: "center",
      render: (isActive: boolean, record) => (
        <Switch 
          checked={isActive}
          onChange={(checked) => handleToggleStatus(record.id, checked)}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Popconfirm
          title="Xóa tài khoản"
          description="Bạn có chắc chắn muốn xóa tài khoản ngân hàng này không?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card
        title={<Title level={4} className="!mb-0">Tài khoản ngân hàng của tôi</Title>}
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsModalVisible(true)}
          >
            Thêm tài khoản mới
          </Button>
        }
        className="shadow-sm rounded-xl border border-gray-100"
      >
        <Table
          columns={columns}
          dataSource={bankAccounts}
          rowKey="id"
          loading={status === "loading"}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} tài khoản`,
          }}
          size="middle"
        />
      </Card>

      <Modal
        title="Thêm tài khoản ngân hàng mới"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={isSubmitting}
        okText="Thêm mới"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          className="mt-4"
        >
          <Form.Item
            name="bankName"
            label="Tên ngân hàng"
            rules={BANK_ACCOUNT_RULES.bankName}
          >
            <Input placeholder="VD: Vietcombank" />
          </Form.Item>
          
          <Form.Item
            name="bankCode"
            label="Mã ngân hàng"
            rules={BANK_ACCOUNT_RULES.bankCode}
          >
            <Input placeholder="VD: VCB" />
          </Form.Item>

          <Form.Item
            name="accountNumber"
            label="Số tài khoản"
            rules={BANK_ACCOUNT_RULES.accountNumber}
          >
            <Input placeholder="Nhập số tài khoản" />
          </Form.Item>

          <Form.Item
            name="accountHolder"
            label="Tên chủ tài khoản"
            rules={BANK_ACCOUNT_RULES.accountHolder}
          >
            <Input placeholder="VD: NGUYEN VAN A" className="uppercase" />
          </Form.Item>

          <Form.Item
            name="branch"
            label="Chi nhánh (Không bắt buộc)"
            rules={BANK_ACCOUNT_RULES.branch}
          >
            <Input placeholder="Nhập tên chi nhánh" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
