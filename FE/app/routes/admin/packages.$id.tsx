import { useState } from "react";
import { Link, useRevalidator } from "react-router";
import {
  Card,
  Descriptions,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Tag,
  Empty,
  message,
  Typography,
} from "antd";
import { packagesApi } from "~/lib/api/logistics";
import { PackageStatusBadge } from "~/components/shared/PackageStatusBadge";
import { PackageTimeline } from "~/components/customer/PackageTimeline";
import { useAuth } from "~/lib/hooks/useAuth";
import { formatVND, formatWeight, formatDate } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import {
  PACKAGING_TYPE_LABEL,
  INSURANCE_LEVEL_LABEL,
  PACKAGE_IMAGE_TYPES,
  PACKAGE_IMAGE_TYPE_LABEL,
} from "~/lib/constants/logistics";
import type {
  PackageDetail,
  PackageFee,
  PackageImage,
} from "~/lib/types/logistics";
import type { Route } from "./+types/packages.$id";

const { Title, Text } = Typography;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết kiện — Quản trị" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [detailRes, feeRes] = await Promise.all([
    packagesApi.getDetail(params.id!),
    packagesApi.getFee(params.id!),
  ]);
  if (!detailRes.data)
    throw new Response("Không tìm thấy kiện", { status: 404 });
  return { pkg: detailRes.data, fee: feeRes.data };
}

export default function AdminPackageDetailPage({
  loaderData,
}: {
  loaderData: { pkg: PackageDetail; fee: PackageFee | null };
}) {
  const { pkg, fee } = loaderData;
  const { hasPermission } = useAuth();
  const canManage = hasPermission("warehouse.manage");
  const revalidator = useRevalidator();

  const [feeOpen, setFeeOpen] = useState(false);
  const [feeForm] = Form.useForm();
  const [calcLoading, setCalcLoading] = useState(false);

  const [imgOpen, setImgOpen] = useState(false);
  const [imgForm] = Form.useForm();
  const [imgLoading, setImgLoading] = useState(false);
  // BE chưa có endpoint list ảnh → chỉ hiển thị ảnh vừa upload trong phiên.
  const [sessionImages, setSessionImages] = useState<PackageImage[]>([]);

  const feeCalculated = fee?.calculatedAt != null;

  const handleCalcFee = async () => {
    const values = await feeForm.validateFields();
    setCalcLoading(true);
    try {
      await packagesApi.calculateFee(pkg.id, {
        ratePerKgVnd: values.ratePerKgVnd,
        insuranceRate: values.insuranceRate ?? undefined,
        declaredValueVnd: values.declaredValueVnd ?? undefined,
      });
      message.success("Tính cước thành công.");
      setFeeOpen(false);
      feeForm.resetFields();
      revalidator.revalidate();
    } catch (err) {
      message.error(normalizeError(err).message || "Tính cước thất bại.");
    } finally {
      setCalcLoading(false);
    }
  };

  const handleAddImage = async () => {
    const values = await imgForm.validateFields();
    setImgLoading(true);
    try {
      const res = await packagesApi.addImage(pkg.id, {
        type: values.type,
        url: values.url,
        note: values.note || undefined,
      });
      message.success("Thêm ảnh thành công.");
      if (res.data) setSessionImages((prev) => [res.data, ...prev]);
      setImgOpen(false);
      imgForm.resetFields();
    } catch (err) {
      message.error(normalizeError(err).message || "Thêm ảnh thất bại.");
    } finally {
      setImgLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Link
        to="/admin/packages"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Tra cứu kiện
      </Link>

      <div className="flex items-center gap-3 mt-3 mb-5">
        <Title level={3} className="!mb-0">
          {pkg.barcode}
        </Title>
        <PackageStatusBadge status={pkg.status} />
      </div>

      {/* Thông tin kiện */}
      <Card className="mb-5" title="Thông tin kiện">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Loại đóng gói">
            {PACKAGING_TYPE_LABEL[pkg.packagingType] ?? pkg.packagingType}
          </Descriptions.Item>
          <Descriptions.Item label="Bảo hiểm">
            {pkg.insuranceOpted
              ? pkg.insuranceLevel
                ? INSURANCE_LEVEL_LABEL[pkg.insuranceLevel]
                : "Có"
              : "Không"}
          </Descriptions.Item>
          <Descriptions.Item label="Cân thực tế">
            {pkg.actualWeightKg != null ? formatWeight(pkg.actualWeightKg) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cân thể tích">
            {pkg.volWeightKg != null ? formatWeight(pkg.volWeightKg) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cân tính cước">
            {pkg.chargedWeightKg != null
              ? formatWeight(pkg.chargedWeightKg)
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Kích thước (D×R×C)">
            {pkg.lengthCm != null
              ? `${pkg.lengthCm}×${pkg.widthCm}×${pkg.heightCm} cm`
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Vị trí kho">
            {pkg.zoneCode ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Bao (sack)">
            {pkg.sackId ? <Tag>Đã đóng bao</Tag> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {formatDate(pkg.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật">
            {formatDate(pkg.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Cước quốc tế */}
      <Card
        className="mb-5"
        title="Cước vận chuyển quốc tế"
        extra={
          canManage && (
            <Button type="primary" size="small" onClick={() => setFeeOpen(true)}>
              {feeCalculated ? "Tính lại cước" : "Tính cước"}
            </Button>
          )
        }
      >
        {feeCalculated ? (
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Đơn giá/kg">
              {fee!.ratePerKgVnd != null ? formatVND(fee!.ratePerKgVnd) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Cước vận chuyển">
              {fee!.shipIntlVnd != null ? formatVND(fee!.shipIntlVnd) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Phí bảo hiểm">
              {fee!.insuranceFeeVnd != null
                ? formatVND(fee!.insuranceFeeVnd)
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng cước">
              <span className="font-semibold">
                {fee!.totalFeeVnd != null ? formatVND(fee!.totalFeeVnd) : "—"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Tính lúc">
              {fee!.calculatedAt ? formatDate(fee!.calculatedAt) : "—"}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Text type="secondary">Chưa tính cước cho kiện này.</Text>
        )}
      </Card>

      {/* Ảnh kiện */}
      <Card
        className="mb-5"
        title="Ảnh kiện hàng"
        extra={
          canManage && (
            <Button size="small" onClick={() => setImgOpen(true)}>
              + Thêm ảnh
            </Button>
          )
        }
      >
        {sessionImages.length === 0 ? (
          <Empty
            description="Chưa có ảnh trong phiên này (BE chưa hỗ trợ liệt kê ảnh đã lưu)."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {sessionImages.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-gray-200 overflow-hidden"
              >
                <img
                  src={img.url}
                  alt={img.note ?? img.type}
                  className="w-full h-28 object-cover"
                />
                <div className="px-2 py-1 text-xs text-gray-600">
                  {PACKAGE_IMAGE_TYPE_LABEL[img.type] ?? img.type}
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* Tracking */}
      <Card title="Hành trình kiện hàng">
        <PackageTimeline events={pkg.trackingHistory} />
      </Card>

      {/* Modal tính cước */}
      <Modal
        open={feeOpen}
        title="Tính cước vận chuyển quốc tế"
        onCancel={() => setFeeOpen(false)}
        onOk={handleCalcFee}
        okText="Tính cước"
        confirmLoading={calcLoading}
        destroyOnClose
      >
        <Form form={feeForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="ratePerKgVnd"
            label="Đơn giá / kg (VND)"
            rules={[{ required: true, message: "Nhập đơn giá/kg." }]}
          >
            <InputNumber className="w-full" min={0} step={1000} />
          </Form.Item>
          <Form.Item
            name="insuranceRate"
            label="Tỷ lệ bảo hiểm (VD 0.02 = 2%)"
            tooltip="Áp dụng nếu kiện có mua bảo hiểm."
          >
            <InputNumber className="w-full" min={0} max={1} step={0.01} />
          </Form.Item>
          <Form.Item name="declaredValueVnd" label="Giá trị khai báo (VND)">
            <InputNumber className="w-full" min={0} step={1000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thêm ảnh */}
      <Modal
        open={imgOpen}
        title="Thêm ảnh kiện hàng"
        onCancel={() => setImgOpen(false)}
        onOk={handleAddImage}
        okText="Thêm ảnh"
        confirmLoading={imgLoading}
        destroyOnClose
      >
        <Form
          form={imgForm}
          layout="vertical"
          requiredMark="optional"
          initialValues={{ type: "Receipt" }}
        >
          <Form.Item name="type" label="Loại ảnh" rules={[{ required: true }]}>
            <Select
              options={PACKAGE_IMAGE_TYPES.map((t) => ({
                value: t,
                label: PACKAGE_IMAGE_TYPE_LABEL[t],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL ảnh"
            rules={[
              { required: true, message: "Nhập URL ảnh." },
              { type: "url", message: "URL không hợp lệ." },
            ]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
