import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Space,
  Typography,
  Card,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "~/lib/feature/customerProfile/customerProfileThunk";
import type {
  CustomerAddressDto,
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from "~/lib/types/customerProfile";
import { CUSTOMER_ADDRESS_RULES } from "~/lib/validations/finance";
import { ReduxStatus } from "~/lib/feature/const";

const { Title, Text } = Typography;

export default function CustomerAddressesPage() {
  const dispatch = useAppDispatch();
  const { addresses, status } = useAppSelector(
    (state) => state.customerProfileState
  );

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    dispatch(fetchMyAddresses());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setEditingId(null);
    form.resetFields();
    // Set some defaults
    form.setFieldsValue({ isDefault: false });
    setIsModalVisible(true);
  };

  const handleOpenEdit = (record: CustomerAddressDto) => {
    setEditingId(record.id);
    form.setFieldsValue({
      label: record.label,
      recipientName: record.recipientName,
      phone: record.phone,
      addressLine: record.addressLine,
      wardCode: record.wardCode,
      districtCode: record.districtCode,
      provinceCode: record.provinceCode,
      isDefault: record.isDefault,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteAddress(id)).unwrap();
      message.success("Xóa địa chỉ thành công!");
    } catch (error: any) {
      message.error(error || "Xóa địa chỉ thất bại!");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await dispatch(setDefaultAddress(id)).unwrap();
      message.success("Đã đặt làm địa chỉ mặc định!");
    } catch (error: any) {
      message.error(error || "Đặt địa chỉ mặc định thất bại!");
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleFinish = async (values: any) => {
    try {
      if (editingId) {
        const updateData: UpdateCustomerAddressDto = {
          label: values.label,
          recipientName: values.recipientName,
          phone: values.phone,
          addressLine: values.addressLine,
          wardCode: values.wardCode,
          districtCode: values.districtCode,
          provinceCode: values.provinceCode,
          isDefault: values.isDefault,
        };
        await dispatch(
          updateAddress({ id: editingId, data: updateData })
        ).unwrap();
        message.success("Cập nhật địa chỉ thành công!");
      } else {
        const createData: CreateCustomerAddressDto = {
          label: values.label,
          recipientName: values.recipientName,
          phone: values.phone,
          addressLine: values.addressLine,
          wardCode: values.wardCode,
          districtCode: values.districtCode,
          provinceCode: values.provinceCode,
          isDefault: values.isDefault,
        };
        await dispatch(createAddress(createData)).unwrap();
        message.success("Thêm địa chỉ thành công!");
      }
      setIsModalVisible(false);
    } catch (error: any) {
      message.error(error || "Đã xảy ra lỗi!");
    }
  };

  const columns = [
    {
      title: "Nhãn",
      dataIndex: "label",
      key: "label",
      render: (text: string, record: CustomerAddressDto) => (
        <Space direction="vertical" size="small">
          <Text strong>{text || "Không có nhãn"}</Text>
          {record.isDefault && <Tag color="blue">Mặc định</Tag>}
        </Space>
      ),
    },
    {
      title: "Người nhận",
      dataIndex: "recipientName",
      key: "recipientName",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Địa chỉ chi tiết",
      dataIndex: "addressLine",
      key: "addressLine",
      render: (text: string, record: CustomerAddressDto) => {
        const parts = [
          text,
          record.wardCode,
          record.districtCode,
          record.provinceCode,
        ].filter(Boolean);
        return <Text>{parts.join(", ")}</Text>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_: any, record: CustomerAddressDto) => (
        <Space size="middle">
          {!record.isDefault && (
            <Popconfirm
              title="Đặt làm địa chỉ mặc định?"
              onConfirm={() => handleSetDefault(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button type="link" icon={<CheckCircleOutlined />}>
                Mặc định
              </Button>
            </Popconfirm>
          )}
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa địa chỉ này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card
        title={<Title level={4}>Danh sách địa chỉ</Title>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm địa chỉ mới
          </Button>
        }
        className="shadow-sm"
      >
        <Table
          columns={columns}
          dataSource={addresses}
          rowKey="id"
          size="middle"
          loading={status === ReduxStatus.LOADING}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="label"
                label="Nhãn địa chỉ (VD: Nhà riêng, Công ty)"
                rules={CUSTOMER_ADDRESS_RULES.label}
              >
                <Input placeholder="Nhập nhãn địa chỉ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recipientName"
                label="Tên người nhận"
                rules={CUSTOMER_ADDRESS_RULES.recipientName}
              >
                <Input placeholder="Nhập tên người nhận" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Số điện thoại"
                rules={CUSTOMER_ADDRESS_RULES.phone}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isDefault"
                label="Đặt làm mặc định"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="addressLine"
            label="Địa chỉ chi tiết (Số nhà, đường...)"
            rules={CUSTOMER_ADDRESS_RULES.addressLine}
          >
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ chi tiết" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="provinceCode"
                label="Tỉnh/Thành phố"
                rules={CUSTOMER_ADDRESS_RULES.provinceCode}
              >
                <Input placeholder="Nhập Tỉnh/Thành phố" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="districtCode"
                label="Quận/Huyện"
                rules={CUSTOMER_ADDRESS_RULES.districtCode}
              >
                <Input placeholder="Nhập Quận/Huyện" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="wardCode"
                label="Phường/Xã"
                rules={CUSTOMER_ADDRESS_RULES.wardCode}
              >
                <Input placeholder="Nhập Phường/Xã" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={status === ReduxStatus.LOADING}
              >
                {editingId ? "Cập nhật" : "Tạo mới"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
