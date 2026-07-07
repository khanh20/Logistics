import { useMemo, useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import {
  Form,
  Select,
  Checkbox,
  Input,
  InputNumber,
  Button,
  Alert,
  message,
} from "antd";
import { store } from "~/lib/feature/store";
import { deliveryRequestsApi, myPackagesApi } from "~/lib/api/logistics";
import { customerProfileApi } from "~/lib/api/customerProfile";
import {
  DOMESTIC_CARRIERS,
  DELIVERY_ERROR_MESSAGE,
} from "~/lib/constants/logistics";
import { formatWeight, numberFormatter, numberParser } from "~/lib/utils/format";
import { normalizeError } from "~/lib/utils/errors";
import type { PackageSummary } from "~/lib/types/logistics";
import type { CustomerAddressDto } from "~/lib/types/customerProfile";
import type { Route } from "./+types/delivery-requests.new";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Tạo yêu cầu giao hàng — MuaHo" }];
}

// Chỉ kiện đã về kho VN mới giao nội địa được (khớp PackageNotReadyForDeliveryException).
const READY_STATUS = "InVnWarehouse";

export async function clientLoader(_: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const [pkgRes, addrRes] = await Promise.all([
    myPackagesApi.list(),
    customerProfileApi.getMyAddresses(),
  ]);

  const readyPackages = (pkgRes.data ?? []).filter(
    (p) => p.status === READY_STATUS
  );
  return { readyPackages, addresses: addrRes.data ?? [] };
}

interface FormValues {
  packageIds: string[];
  carrierId: string;
  deliveryAddressId: string;
  recipientName: string;
  recipientTel: string;
  province: string;
  district: string;
  ward: string;
  address: string;
  preferredTimeSlot?: string;
  codAmount?: number;
}

export default function NewDeliveryRequestPage({
  loaderData,
}: {
  loaderData: { readyPackages: PackageSummary[]; addresses: CustomerAddressDto[] };
}) {
  const { readyPackages, addresses } = loaderData;
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const selectedIds: string[] = Form.useWatch("packageIds", form) ?? [];
  const carrierId: string | undefined = Form.useWatch("carrierId", form);

  const carrier = useMemo(
    () => DOMESTIC_CARRIERS.find((c) => c.id === carrierId),
    [carrierId]
  );

  // Tổng cân tính cước của các kiện đã chọn (để cảnh báo vượt tải trước khi submit).
  const totalWeight = useMemo(
    () =>
      readyPackages
        .filter((p) => selectedIds.includes(p.id))
        .reduce((sum, p) => sum + (p.chargedWeightKg ?? 0), 0),
    [readyPackages, selectedIds]
  );

  const overWeight = carrier != null && totalWeight > carrier.maxWeightKg;

  // Prefill thông tin người nhận khi chọn địa chỉ đã lưu.
  const handleAddressChange = (id: string) => {
    const addr = addresses.find((a) => a.id === id);
    if (addr) {
      form.setFieldsValue({
        recipientName: addr.recipientName,
        recipientTel: addr.phone,
        address: addr.addressLine,
      });
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await deliveryRequestsApi.create({
        packageIds: values.packageIds,
        carrierId: values.carrierId,
        deliveryAddressId: values.deliveryAddressId,
        recipientName: values.recipientName,
        recipientTel: values.recipientTel,
        province: values.province,
        district: values.district,
        ward: values.ward,
        address: values.address,
        preferredTimeSlot: values.preferredTimeSlot || undefined,
        codAmount: values.codAmount ?? undefined,
      });
      const created = res.data;
      message.success(
        created?.shipFeeVnd != null
          ? `Tạo yêu cầu thành công. Cước nội địa tạm tính: ${created.shipFeeVnd.toLocaleString("vi-VN")}₫`
          : "Tạo yêu cầu giao hàng thành công."
      );
      navigate(created ? `/delivery-requests/${created.id}` : "/delivery-requests");
    } catch (err) {
      const norm = normalizeError(err);
      message.error(
        (norm.code && DELIVERY_ERROR_MESSAGE[norm.code]) ||
          norm.message ||
          "Tạo yêu cầu giao hàng thất bại."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/delivery-requests"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <span className="mr-2">←</span> Yêu cầu giao hàng
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Tạo yêu cầu giao hàng
      </h1>

      {readyPackages.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có kiện sẵn sàng giao"
          description="Chỉ những kiện đã về kho VN mới có thể tạo yêu cầu giao nội địa."
        />
      ) : addresses.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa có địa chỉ nhận hàng"
          description={
            <span>
              Vui lòng thêm địa chỉ trong{" "}
              <Link to="/addresses" className="text-primary underline">
                Sổ địa chỉ
              </Link>{" "}
              trước khi tạo yêu cầu.
            </span>
          }
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={handleSubmit}
          initialValues={{ carrierId: DOMESTIC_CARRIERS[0].id }}
        >
          <Form.Item
            name="packageIds"
            label="Kiện hàng cần giao"
            rules={[{ required: true, message: "Chọn ít nhất 1 kiện." }]}
          >
            <Checkbox.Group className="flex flex-col gap-2 w-full">
              {readyPackages.map((p) => (
                <Checkbox key={p.id} value={p.id} className="w-full">
                  <span className="font-mono text-xs">{p.barcode}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    {p.chargedWeightKg != null
                      ? formatWeight(p.chargedWeightKg)
                      : "chưa cân"}
                  </span>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name="carrierId"
            label="Đơn vị vận chuyển"
            rules={[{ required: true }]}
          >
            <Select
              options={DOMESTIC_CARRIERS.map((c) => ({
                value: c.id,
                label: `${c.name} (tối đa ${c.maxWeightKg}kg)${c.isReal ? "" : " — demo"}`,
              }))}
            />
          </Form.Item>

          {overWeight && (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              message={`Tổng cân nặng ${formatWeight(totalWeight)} vượt giới hạn ${carrier!.maxWeightKg}kg của ${carrier!.name}.`}
            />
          )}

          <Form.Item
            name="deliveryAddressId"
            label="Địa chỉ nhận"
            rules={[{ required: true, message: "Chọn địa chỉ nhận." }]}
          >
            <Select
              placeholder="Chọn từ sổ địa chỉ"
              onChange={handleAddressChange}
              options={addresses.map((a) => ({
                value: a.id,
                label: `${a.recipientName} · ${a.phone} · ${a.addressLine}`,
              }))}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              name="recipientName"
              label="Người nhận"
              rules={[{ required: true, message: "Nhập tên người nhận." }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="recipientTel"
              label="Số điện thoại"
              rules={[{ required: true, message: "Nhập số điện thoại." }]}
            >
              <Input />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-x-4">
            <Form.Item
              name="province"
              label="Tỉnh/Thành"
              rules={[{ required: true, message: "Nhập tỉnh/thành." }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="district"
              label="Quận/Huyện"
              rules={[{ required: true, message: "Nhập quận/huyện." }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="ward"
              label="Phường/Xã"
              rules={[{ required: true, message: "Nhập phường/xã." }]}
            >
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="address"
            label="Địa chỉ chi tiết"
            rules={[{ required: true, message: "Nhập địa chỉ chi tiết." }]}
          >
            <Input placeholder="Số nhà, tên đường..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="preferredTimeSlot" label="Khung giờ giao (tuỳ chọn)">
              <Input placeholder="VD: Sáng 8-11h" />
            </Form.Item>
            <Form.Item name="codAmount" label="Thu hộ COD (tuỳ chọn)">
              <InputNumber
                className="w-full"
                min={0}
                addonAfter="₫"
                formatter={numberFormatter}
                parser={numberParser}
              />
            </Form.Item>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={submitting}
            disabled={overWeight}
          >
            Tạo yêu cầu giao hàng
          </Button>
        </Form>
      )}
    </div>
  );
}
