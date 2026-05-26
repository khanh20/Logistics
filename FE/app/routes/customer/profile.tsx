import { useEffect, useState } from "react";
import {
  Tabs,
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Card,
  Typography,
  message,
  Alert,
  Upload,
  Spin,
  Row,
  Col,
  Table,
  Popconfirm,
} from "antd";
import { CameraFilled, UploadOutlined, SaveOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyProfile,
  updateProfile,
  createMyProfile,
  fetchKyc,
  submitKyc,
  fetchMyAddresses,
} from "~/lib/feature/customerProfile/customerProfileThunk";
import { updateUserLocal } from "~/lib/feature/auth/authSlice";
import {
  selectProfile,
  selectKyc,
  selectProfileStatus,
  selectAddresses,
} from "~/lib/feature/customerProfile/customerProfileSelector";
import { customerProfileApi } from "~/lib/api/customerProfile";
import { financeApi } from "~/lib/api/finance";
import { authApi } from "~/lib/api/auth";
import { PreferredChannel, KycStatus, Gender } from "~/lib/enums/finance";
import {
  GENDER_LABELS,
  PREFERRED_CHANNEL_LABELS,
} from "~/lib/constants/finance";
import { VIETNAM_BANKS } from "~/lib/constants/banks";
import { CUSTOMER_PROFILE_RULES, BANK_ACCOUNT_RULES, KYC_RULES } from "~/lib/validations/finance";
import type { UpdateKycFromOcrRequest } from "~/lib/types/customerProfile";

const { Title, Text } = Typography;

export default function CustomerProfilePage() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectProfile);
  const kyc = useAppSelector(selectKyc);
  const status = useAppSelector(selectProfileStatus);
  const addresses = useAppSelector(selectAddresses);
  const user = useAppSelector((state: any) => state.authState.user);

  const [personalForm] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [bankForm] = Form.useForm();
  const [kycForm] = Form.useForm();

  const [scanning, setScanning] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [ocrData, setOcrData] = useState<UpdateKycFromOcrRequest | null>(null);
  const [isUpdatingPersonal, setIsUpdatingPersonal] = useState(false);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);
  const [isAddingBank, setIsAddingBank] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const res = await financeApi.getMyBankAccounts();
      if (res.data) {
        setBankAccounts(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    dispatch(fetchMyProfile());
    dispatch(fetchKyc());
    dispatch(fetchMyAddresses());
    fetchBanks();
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      personalForm.setFieldsValue({
        fullName: profile.fullName,
        dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : undefined,
        gender: profile.gender,
        preferredChannel: profile.preferredChannel ?? PreferredChannel.App,
        zaloUserId: profile.zaloUserId,
      });
    }
  }, [profile, personalForm]);

  useEffect(() => {
    if (user) {
      contactForm.setFieldsValue({
        phone: user.phone,
        email: user.email,
      });
    }
  }, [user, contactForm]);

  const handleUpdate = async (payload: any) => {
    try {
      setIsUpdatingPersonal(true);
      if (profile?.id) {
        await dispatch(updateProfile({ id: profile.id, data: payload })).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(updateUserLocal({ phone: payload.phone, email: payload.email }));
        }
        dispatch(fetchMyProfile());
        message.success("Cập nhật thông tin thành công");
      } else {
        await dispatch(createMyProfile({ ...payload, customerCode: `CUST-${Date.now()}` })).unwrap();
        if (payload.phone !== undefined || payload.email !== undefined) {
          dispatch(updateUserLocal({ phone: payload.phone, email: payload.email }));
        }
        dispatch(fetchMyProfile());
        message.success("Tạo thông tin thành công");
      }
    } catch (error: any) {
      message.error(error || "Lỗi cập nhật thông tin");
    } finally {
      setIsUpdatingPersonal(false);
    }
  };

  const onPersonalFinish = async (values: any) => {
    const payload = {
      ...values,
      dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") + "T00:00:00Z" : undefined,
      preferredChannel: values.preferredChannel ?? profile?.preferredChannel ?? PreferredChannel.App,
      zaloUserId: values.zaloUserId ?? profile?.zaloUserId,
    };
    await handleUpdate(payload);
  };

  const onContactFinish = async (values: any) => {
    try {
      setIsUpdatingContact(true);
      const fullName = personalForm.getFieldValue("fullName") ?? profile?.fullName ?? user?.fullName ?? "Chưa có tên";
      await authApi.updateMe({ fullName, phone: values.phone });
      dispatch(updateUserLocal({ phone: values.phone }));
      message.success("Cập nhật thông tin liên hệ thành công");
    } catch (error: any) {
      message.error(error?.message || "Lỗi cập nhật thông liên hệ");
    } finally {
      setIsUpdatingContact(false);
    }
  };

  const onBankFinish = async (values: any) => {
    try {
      setIsAddingBank(true);
      await financeApi.createBankAccount(values);
      message.success("Thêm tài khoản ngân hàng thành công");
      bankForm.resetFields();
      setShowBankForm(false);
      fetchBanks();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi thêm ngân hàng");
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleDeleteBank = async (id: string) => {
    try {
      await financeApi.deleteBankAccount(id);
      message.success("Đã xóa tài khoản ngân hàng");
      fetchBanks();
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi xóa ngân hàng");
    }
  };

  const bankColumns = [
    { title: "Ngân hàng", dataIndex: "bankName", key: "bankName" },
    { title: "Chủ tài khoản", dataIndex: "accountHolder", key: "accountHolder" },
    { title: "Số tài khoản", dataIndex: "accountNumber", key: "accountNumber" },
    {
      title: "",
      key: "action",
      render: (_: any, record: any) => (
        <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDeleteBank(record.id)}>
          <Button danger type="text" size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const handleScan = async () => {
    if (!frontFile) {
      message.error("Vui lòng tải lên ảnh mặt trước CCCD");
      return;
    }
    setScanning(true);
    try {
      const res = await customerProfileApi.scanCccd(frontFile, backFile || undefined);
      if (res.data) {
        const { rawText, message: msg, customerId, expiryDate, ...parsed } = res.data;
        setOcrData(parsed);
        kycForm.setFieldsValue({
          ...parsed,
          dateOfBirthOnId: parsed.dateOfBirthOnId ? dayjs(parsed.dateOfBirthOnId) : undefined,
        });
        message.success("Quét CCCD thành công. Vui lòng kiểm tra lại thông tin!");
      }
    } catch (err: any) {
      message.error(err?.message || "Lỗi quét CCCD");
    } finally {
      setScanning(false);
    }
  };

  const onKycSubmit = async (values: any) => {
    if (!ocrData) return;
    const payload: UpdateKycFromOcrRequest = {
      ...ocrData,
      ...values,
      dateOfBirthOnId: values.dateOfBirthOnId ? values.dateOfBirthOnId.format("YYYY-MM-DD") + "T00:00:00Z" : undefined,
    };

    try {
      await dispatch(submitKyc(payload)).unwrap();
      message.success("Gửi hồ sơ KYC thành công");
      dispatch(fetchKyc());
      setOcrData(null);
      setFrontFile(null);
      setBackFile(null);
    } catch (err: any) {
      message.error(err || "Lỗi gửi hồ sơ KYC");
    }
  };

  const kycStatusStr = kyc?.status?.toString() || "";
  const isPendingOrApproved =
    kycStatusStr === "Pending" ||
    kycStatusStr === KycStatus.Pending.toString() ||
    kycStatusStr === "Approved" ||
    kycStatusStr === KycStatus.Approved.toString();

  const isRejected =
    kycStatusStr === "Rejected" ||
    kycStatusStr === KycStatus.Rejected.toString();

  let kycAlertMsg = "Trạng thái KYC: Chờ duyệt";
  let kycAlertType: "success" | "info" | "error" | "warning" = "info";

  if (kycStatusStr === "Approved" || kycStatusStr === KycStatus.Approved.toString()) {
    kycAlertMsg = "Trạng thái KYC: Đã duyệt";
    kycAlertType = "success";
  } else if (isRejected) {
    kycAlertMsg = "Trạng thái KYC: Bị từ chối";
    kycAlertType = "error";
  } else if (kycStatusStr === "Pending" || kycStatusStr === KycStatus.Pending.toString()) {
    kycAlertMsg = "Trạng thái KYC: Chờ duyệt";
    kycAlertType = "warning";
  }

  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
  const addressString = defaultAddress
    ? [defaultAddress.addressLine, defaultAddress.wardCode, defaultAddress.districtCode, defaultAddress.provinceCode].filter(Boolean).join(", ")
    : "Chưa cập nhật địa chỉ";

  const formatVnd = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="shadow-sm h-full flex flex-col items-center justify-center py-6 border border-gray-200">
            <div className="relative inline-block mb-4 text-center">
              <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-white shadow flex items-center justify-center overflow-hidden mx-auto relative group cursor-pointer">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 font-medium text-center leading-tight text-sm">
                    NO IMAGE<br />AVAILABLE
                  </span>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraFilled className="text-white text-2xl" />
                </div>
              </div>
              <button className="absolute bottom-1 right-1/4 translate-x-1 bg-red-500 text-white p-2 rounded-full shadow hover:bg-red-600 transition flex items-center justify-center z-10 border-2 border-white cursor-pointer">
                <CameraFilled />
              </button>
            </div>
            <div className="text-center mt-2">
              <Title level={4} className="!mb-1 text-blue-600 uppercase">
                {user?.fullName || user?.email?.split('@')[0] || "KHÁCH HÀNG"}
              </Title>
              <Text type="secondary" className="text-sm block">{user?.roles?.length ? user.roles.join(', ') : "Không có"}</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card className="shadow-sm h-full flex flex-col justify-center border border-gray-200 p-2">
            <Row gutter={[16, 16]} className="text-sm md:text-base">
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2 border-b border-gray-100">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Giới tính:</Text>
                <Text className="xl:w-1/2 text-gray-600">{profile?.gender !== undefined ? GENDER_LABELS[profile.gender as unknown as keyof typeof GENDER_LABELS] : "Chưa cập nhật"}</Text>
              </Col>
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2 border-b border-gray-100">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Số điện thoại:</Text>
                <Text className="xl:w-1/2 text-gray-600">{user?.phone || "Chưa cập nhật"}</Text>
              </Col>
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2 border-b border-gray-100">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Email:</Text>
                <Text className="xl:w-1/2 truncate text-gray-600" title={user?.email}>{user?.email || "Chưa cập nhật"}</Text>
              </Col>
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2 border-b border-gray-100">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Địa chỉ:</Text>
                <Text className="xl:w-1/2 truncate text-gray-600" title={addressString}>{addressString}</Text>
              </Col>
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Tổng tiền đã thanh toán:</Text>
                <Text className="xl:w-1/2 text-red-500 font-bold">{formatVnd(profile?.lifetimeValueVnd || 0)}</Text>
              </Col>
              <Col span={12} className="flex flex-col xl:flex-row xl:items-center py-2">
                <Text className="font-semibold xl:w-1/2 mb-1 xl:mb-0 text-gray-700">Mã khách hàng:</Text>
                <Text className="xl:w-1/2 text-gray-600 font-medium">{profile?.customerCode || "Chưa tạo"}</Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <div className="pt-4 pb-2 border-b border-gray-200 flex justify-between items-center">
        <Title level={4} className="!mb-0 uppercase font-bold text-gray-800">THÔNG TIN TÀI KHOẢN</Title>
      </div>

      <Tabs
        defaultActiveKey="account"
        type="card"
        className="profile-tabs"
        items={[
          {
            key: "account",
            label: <span className="font-medium px-4">Thông tin tài khoản</span>,
            children: (
              <Spin spinning={status === "loading"}>
                <Row gutter={[24, 24]} className="mt-4 flex items-stretch">
                  <Col xs={24} lg={8}>
                    <Card
                      title={<span className="font-bold text-gray-800 text-base">Thông tin cá nhân</span>}
                      className="shadow-sm border border-gray-200 h-full flex flex-col"
                      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                    >
                      <Form
                        form={personalForm}
                        layout="vertical"
                        onFinish={onPersonalFinish}
                        requiredMark={false}
                        className="flex flex-col flex-1"
                      >
                        <Form.Item label={<span className="font-medium text-gray-600">Username</span>} className="mb-5">
                          <Input value={user?.email?.split('@')[0] || "username"} disabled className="bg-gray-100 cursor-not-allowed text-gray-500" size="large" />
                        </Form.Item>
                        <Form.Item label={<span className="font-medium text-gray-600">Họ & tên của bạn</span>} name="fullName" className="mb-5" rules={CUSTOMER_PROFILE_RULES.fullName}>
                          <Input placeholder="Nhập họ và tên" size="large" />
                        </Form.Item>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label={<span className="font-medium text-gray-600">Giới tính</span>} name="gender" className="mb-5">
                              <Select placeholder="Chọn giới tính" size="large">
                                {Object.entries(GENDER_LABELS).map(([key, label]) => (
                                  <Select.Option key={Number(key)} value={Number(key)}>
                                    {label}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={<span className="font-medium text-gray-600">Ngày sinh</span>} name="dateOfBirth" className="mb-5">
                              <DatePicker format="DD/MM/YYYY" className="w-full" size="large" placeholder="Chọn ngày sinh" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label={<span className="font-medium text-gray-600">Kênh liên lạc ưu tiên</span>} name="preferredChannel" className="mb-5">
                              <Select placeholder="Chọn kênh ưu tiên" size="large">
                                {Object.entries(PREFERRED_CHANNEL_LABELS).map(([key, label]) => (
                                  <Select.Option key={Number(key)} value={Number(key)}>
                                    {label}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label={<span className="font-medium text-gray-600">Zalo User ID</span>} name="zaloUserId" className="mb-5">
                              <Input placeholder="Nhập Zalo User ID (Tùy chọn)" size="large" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <div className="flex justify-center mt-auto border-t border-gray-100 pt-4">
                          <Button type="primary" htmlType="submit" loading={isUpdatingPersonal} className="bg-red-500 hover:bg-red-600 border-none px-6 shadow font-medium" size="large">
                            Cập nhật
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card
                      title={<span className="font-bold text-gray-800 text-base">Thông tin liên hệ</span>}
                      className="shadow-sm border border-gray-200 h-full flex flex-col"
                      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                    >
                      <Form
                        form={contactForm}
                        layout="vertical"
                        onFinish={onContactFinish}
                        requiredMark={false}
                        className="flex flex-col flex-1"
                      >
                        <Form.Item label={<span className="font-medium text-gray-600">Địa chỉ Email</span>} name="email" className="mb-5">
                          <Input disabled className="bg-gray-100 cursor-not-allowed text-gray-500" size="large" placeholder="Nhập email" />
                        </Form.Item>
                        <Form.Item label={<><span className="text-red-500 mr-1">*</span><span className="font-medium text-gray-600">Số điện thoại</span></>} name="phone" className="mb-5">
                          <Input className="bg-white text-gray-800" size="large" placeholder="Nhập số điện thoại" />
                        </Form.Item>

                        <div className="flex justify-center mt-auto border-t border-gray-100 pt-4">
                          <Button type="primary" htmlType="submit" loading={isUpdatingContact} className="bg-red-500 hover:bg-red-600 border-none px-6 shadow font-medium" size="large">
                            Cập nhật
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card
                      title={
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-gray-800 text-base">Thông tin ngân hàng</span>
                          {bankAccounts.length > 0 && !showBankForm && (
                            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setShowBankForm(true)} className="bg-blue-500 text-xs">
                              Thêm mới
                            </Button>
                          )}
                        </div>
                      }
                      className="shadow-sm border border-gray-200 h-full flex flex-col"
                      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
                    >
                      {bankAccounts.length > 0 && !showBankForm ? (
                        <div className="flex flex-col flex-1 overflow-x-auto hide-scrollbar">
                          <Table
                            dataSource={bankAccounts}
                            columns={bankColumns}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            loading={loadingBanks}
                            className="whitespace-nowrap hide-scrollbar"
                          />
                        </div>
                      ) : (
                        <Form
                          form={bankForm}
                          layout="vertical"
                          onFinish={onBankFinish}
                          requiredMark={false}
                          className="flex flex-col flex-1"
                        >
                          <Form.Item label={<span className="font-medium text-gray-600">Ngân hàng</span>} name="bankCode" className="mb-4" rules={BANK_ACCOUNT_RULES.bankCode}>
                            <Select
                              placeholder="Chọn ngân hàng"
                              size="large"
                              showSearch
                              optionFilterProp="label"
                              onChange={(val) => {
                                const bank = VIETNAM_BANKS.find(b => b.code === val);
                                if (bank) {
                                  bankForm.setFieldsValue({ bankName: bank.shortName });
                                }
                              }}
                              options={VIETNAM_BANKS.map(bank => ({
                                value: bank.code,
                                label: `${bank.shortName} - ${bank.name}`,
                              }))}
                            />
                          </Form.Item>

                          <Form.Item name="bankName" hidden>
                            <Input />
                          </Form.Item>

                          <Form.Item label={<span className="font-medium text-gray-600">Tên chủ tài khoản</span>} name="accountHolder" className="mb-4" rules={BANK_ACCOUNT_RULES.accountHolder}>
                            <Input placeholder="VD: NGUYEN VAN A" size="large" />
                          </Form.Item>

                          <Form.Item label={<span className="font-medium text-gray-600">Số tài khoản</span>} name="accountNumber" className="mb-4" rules={BANK_ACCOUNT_RULES.accountNumber}>
                            <Input placeholder="Số tài khoản" size="large" />
                          </Form.Item>

                          <Form.Item label={<span className="font-medium text-gray-600">Chi nhánh</span>} name="branch" className="mb-4">
                            <Input placeholder="Tùy chọn" size="large" />
                          </Form.Item>

                          <div className="flex justify-center mt-auto border-t border-gray-100 pt-4 gap-2">
                            {bankAccounts.length > 0 && (
                              <Button onClick={() => setShowBankForm(false)} size="large">Hủy</Button>
                            )}
                            <Button type="primary" htmlType="submit" loading={isAddingBank} icon={<PlusOutlined />} className="bg-red-500 hover:bg-red-600 border-none px-6 shadow font-medium" size="large">
                              Thêm mới
                            </Button>
                          </div>
                        </Form>
                      )}
                    </Card>
                  </Col>
                </Row>
              </Spin>
            ),
          },
          {
            key: "kyc",
            label: <span className="font-medium px-4">Xác minh CCCD</span>,
            children: (
              <Spin spinning={status === "loading" || scanning}>
                <div className="mt-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  {kyc && kyc.status !== undefined ? (
                    <Alert
                      message={kycAlertMsg}
                      description={isRejected && kyc.rejectionReason ? `Lý do từ chối: ${kyc.rejectionReason}` : undefined}
                      type={kycAlertType}
                      showIcon
                      className="mb-6"
                    />
                  ) : null}

                  {(!kyc || isRejected) && !isPendingOrApproved && (
                    <div className="max-w-4xl mx-auto">
                      {!ocrData && (
                        <>
                          <Title level={5} className="mb-4 text-gray-800">Tải lên giấy tờ tùy thân (CCCD/CMND)</Title>
                          <Row gutter={[24, 24]}>
                            <Col xs={24} md={12}>
                              <Card size="small" title="Mặt trước" className="border border-gray-200">
                                <Upload
                                  listType="picture-card"
                                  showUploadList={true}
                                  maxCount={1}
                                  beforeUpload={(file) => {
                                    setFrontFile(file);
                                    return false;
                                  }}
                                  onRemove={() => setFrontFile(null)}
                                  className="w-full flex justify-center"
                                >
                                  {!frontFile && (
                                    <div className="flex flex-col items-center p-4">
                                      <UploadOutlined className="text-2xl text-blue-500" />
                                      <div className="mt-2 text-sm text-gray-500 font-medium">Chọn ảnh mặt trước</div>
                                    </div>
                                  )}
                                </Upload>
                              </Card>
                            </Col>
                            <Col xs={24} md={12}>
                              <Card size="small" title="Mặt sau" className="border border-gray-200">
                                <Upload
                                  listType="picture-card"
                                  showUploadList={true}
                                  maxCount={1}
                                  beforeUpload={(file) => {
                                    setBackFile(file);
                                    return false;
                                  }}
                                  onRemove={() => setBackFile(null)}
                                  className="w-full flex justify-center"
                                >
                                  {!backFile && (
                                    <div className="flex flex-col items-center p-4">
                                      <UploadOutlined className="text-2xl text-blue-500" />
                                      <div className="mt-2 text-sm text-gray-500 font-medium">Chọn ảnh mặt sau</div>
                                    </div>
                                  )}
                                </Upload>
                              </Card>
                            </Col>
                          </Row>
                          <div className="mt-6 flex justify-center">
                            <Button type="primary" onClick={handleScan} loading={scanning} className="bg-blue-600 hover:bg-blue-700 px-8 shadow-md" size="large">
                              Quét Căn cước công dân
                            </Button>
                          </div>
                        </>
                      )}

                      {ocrData && (
                        <Card title={<span className="font-bold text-gray-800">Xác nhận thông tin từ CCCD</span>} className="bg-gray-50 border border-gray-200">
                          <Form
                            form={kycForm}
                            layout="vertical"
                            onFinish={onKycSubmit}
                          >
                            <Row gutter={16}>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Số CCCD</span>} name="idNumber" rules={KYC_RULES.idNumber} className="mb-4">
                                  <Input disabled className="bg-gray-100 text-gray-700 font-bold" size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Họ và tên</span>} name="fullNameOnId" rules={KYC_RULES.fullNameOnId} className="mb-4">
                                  <Input size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Ngày sinh</span>} name="dateOfBirthOnId" rules={[{ required: true, message: "Vui lòng chọn ngày sinh" }]} className="mb-4">
                                  <DatePicker format="DD/MM/YYYY" className="w-full" size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Giới tính</span>} name="gender" className="mb-4">
                                  <Input size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Quốc tịch</span>} name="nationality" className="mb-4">
                                  <Input size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={12}>
                                <Form.Item label={<span className="font-medium text-gray-600">Quê quán</span>} name="placeOfOrigin" className="mb-4">
                                  <Input size="large" />
                                </Form.Item>
                              </Col>
                              <Col span={24}>
                                <Form.Item label={<span className="font-medium text-gray-600">Nơi thường trú</span>} name="placeOfResidence" className="mb-5">
                                  <Input size="large" />
                                </Form.Item>
                              </Col>
                            </Row>
                            <div className="flex justify-center border-t border-gray-200 pt-4">
                              <Button type="primary" htmlType="submit" loading={status === "loading"} className="bg-blue-600 hover:bg-blue-700 px-8 shadow-md" size="large">
                                Gửi yêu cầu xác thực
                              </Button>
                            </div>
                          </Form>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              </Spin>
            ),
          },
        ]}
      />
    </div>
  );
}
