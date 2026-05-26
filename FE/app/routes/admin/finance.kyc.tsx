import { useState, useEffect } from "react";
import { Table, Button, Card, Tag, Modal, Form, Input, message, Descriptions, Image, Row, Col } from "antd";
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import { ReduxStatus } from "~/lib/feature/const";
import { fetchAdminKycs, approveAdminKyc, rejectAdminKyc } from "~/lib/feature/adminFinance/adminFinanceThunk";

export default function AdminFinanceKycPage() {
  const dispatch = useAppDispatch();
  const { kycs, status } = useAppSelector((state) => state.adminFinanceState);

  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectForm] = Form.useForm();
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminKycs());
  }, [dispatch]);

  const handleApprove = async (id: string) => {
    Modal.confirm({
      title: "Xác nhận phê duyệt KYC",
      content: "Bạn có chắc chắn muốn phê duyệt hồ sơ KYC này?",
      okText: "Phê duyệt",
      cancelText: "Hủy",
      onOk: async () => {
        setActionLoading(true);
        try {
          await dispatch(approveAdminKyc(id)).unwrap();
          message.success("Phê duyệt KYC thành công");
          setIsReviewModalOpen(false);
        } catch (error: any) {
          message.error(error || "Lỗi phê duyệt");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleReject = async (values: any) => {
    if (!selectedKyc) return;
    setActionLoading(true);
    try {
      await dispatch(rejectAdminKyc({ id: selectedKyc.id, reason: values.reason })).unwrap();
      message.success("Từ chối KYC thành công");
      setIsRejectModalOpen(false);
      setIsReviewModalOpen(false);
      rejectForm.resetFields();
    } catch (error: any) {
      message.error(error || "Lỗi từ chối");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case "Pending":
        return <Tag color="warning">Chờ duyệt</Tag>;
      case "Approved":
        return <Tag color="success">Đã duyệt</Tag>;
      case "Rejected":
        return <Tag color="error">Từ chối</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: "Ngày tạo",
      dataIndex: "createdDate",
      key: "createdDate",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "Họ tên",
      dataIndex: "fullNameOnId",
      key: "fullNameOnId",
    },
    {
      title: "Số CMND/CCCD",
      dataIndex: "idNumber",
      key: "idNumber",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: any) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedKyc(record);
            setIsReviewModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Xác thực danh tính KYC</h1>
      <Card>
        <Table
          columns={columns}
          dataSource={kycs}
          rowKey="id"
          loading={status === ReduxStatus.LOADING}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Chi tiết hồ sơ KYC"
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        width={1000}
        footer={
          selectedKyc?.status === "Pending"
            ? [
              <Button key="cancel" onClick={() => setIsReviewModalOpen(false)}>
                Đóng
              </Button>,
              <Button
                key="reject"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => setIsRejectModalOpen(true)}
                loading={actionLoading}
              >
                Từ chối
              </Button>,
              <Button
                key="approve"
                type="primary"
                icon={<CheckCircleOutlined />}
                className="bg-green-600 hover:bg-green-700 border-none"
                onClick={() => handleApprove(selectedKyc.id)}
                loading={actionLoading}
              >
                Phê duyệt
              </Button>,
            ]
            : [
              <Button key="cancel" onClick={() => setIsReviewModalOpen(false)}>
                Đóng
              </Button>,
            ]
        }
      >
        {selectedKyc && (
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <h3 className="text-lg font-semibold mb-4">Thông tin OCR trích xuất</h3>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Họ và tên">{selectedKyc.fullNameOnId}</Descriptions.Item>
                <Descriptions.Item label="Số CMND/CCCD">{selectedKyc.idNumber}</Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">
                  {selectedKyc.dateOfBirthOnId ? dayjs(selectedKyc.dateOfBirthOnId).format("DD/MM/YYYY") : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Giới tính">{selectedKyc.gender}</Descriptions.Item>
                <Descriptions.Item label="Quê quán">{selectedKyc.placeOfOrigin}</Descriptions.Item>
                <Descriptions.Item label="Thường trú">{selectedKyc.placeOfResidence}</Descriptions.Item>
                <Descriptions.Item label="Trạng thái hiện tại">{getStatusTag(selectedKyc.status)}</Descriptions.Item>
                {selectedKyc.rejectionReason && (
                  <Descriptions.Item label="Lý do từ chối">
                    <span className="text-red-500 font-medium">{selectedKyc.rejectionReason}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Col>
            <Col span={12}>
              <h3 className="text-lg font-semibold mb-4">Ảnh giấy tờ tùy thân</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-gray-500">Mặt trước:</p>
                  {selectedKyc.idFrontUrl ? (
                    <Image
                      src={selectedKyc.idFrontUrl}
                      alt="Mặt trước"
                      className="rounded-lg shadow-sm w-full object-contain"
                      style={{ maxHeight: 200 }}
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 text-center text-gray-400 rounded-lg">Không có ảnh</div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-gray-500">Mặt sau:</p>
                  {selectedKyc.idBackUrl ? (
                    <Image
                      src={selectedKyc.idBackUrl}
                      alt="Mặt sau"
                      className="rounded-lg shadow-sm w-full object-contain"
                      style={{ maxHeight: 200 }}
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 text-center text-gray-400 rounded-lg">Không có ảnh</div>
                  )}
                </div>
                {/* 
                {selectedKyc.selfieUrl && (
                  <div className="col-span-2">
                    <p className="mb-2 text-gray-500">Ảnh chân dung (Selfie):</p>
                    <Image
                      src={selectedKyc.selfieUrl}
                      alt="Selfie"
                      className="rounded-lg shadow-sm w-full object-contain"
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                )} 
                */}
              </div>
            </Col>
          </Row>
        )}
      </Modal>

      <Modal
        title="Từ chối hồ sơ KYC"
        open={isRejectModalOpen}
        onCancel={() => setIsRejectModalOpen(false)}
        footer={null}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: "Vui lòng nhập lý do từ chối" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="VD: Hình ảnh mặt trước bị mờ, không rõ chữ..."
            />
          </Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={actionLoading}>
              Xác nhận từ chối
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
