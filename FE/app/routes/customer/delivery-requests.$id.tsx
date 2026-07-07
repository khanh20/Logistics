import { useState } from "react";
import { Link, redirect, useNavigate } from "react-router";
import { Popconfirm, message } from "antd";
import { store } from "~/lib/feature/store";
import { deliveryRequestsApi } from "~/lib/api/logistics";
import {
  DeliveryStatusBadge,
  WaybillStatusBadge,
} from "~/components/shared/DeliveryStatusBadge";
import { PackageStatusBadge } from "~/components/shared/PackageStatusBadge";
import { formatVND, formatDate } from "~/lib/utils/format";
import { DELIVERY_CANCELLABLE_STATUSES } from "~/lib/constants/logistics";
import { normalizeError } from "~/lib/utils/errors";
import type { DeliveryRequest } from "~/lib/types/logistics";
import type { Route } from "./+types/delivery-requests.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết yêu cầu giao — MuaHo" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await deliveryRequestsApi.getDetail(params.id!);
  if (!res.data) throw new Response("Không tìm thấy yêu cầu", { status: 404 });
  return { req: res.data };
}

export default function DeliveryRequestDetailPage({
  loaderData,
}: {
  loaderData: { req: DeliveryRequest };
}) {
  const { req } = loaderData;
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  const canCancel = DELIVERY_CANCELLABLE_STATUSES.includes(req.status);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await deliveryRequestsApi.cancel(req.id);
      message.success("Đã huỷ yêu cầu giao hàng.");
      navigate("/delivery-requests", { replace: true });
    } catch (err) {
      message.error(normalizeError(err).message || "Huỷ yêu cầu thất bại.");
      setCancelling(false);
    }
  };

  const infoRows: { label: string; value: string }[] = [
    { label: "Đơn vị vận chuyển", value: req.carrierName ?? "—" },
    {
      label: "Cước nội địa",
      value: req.shipFeeVnd != null ? formatVND(req.shipFeeVnd) : "—",
    },
    {
      label: "Thu hộ (COD)",
      value: req.codAmount != null ? formatVND(req.codAmount) : "Không",
    },
    { label: "Khung giờ giao", value: req.preferredTimeSlot ?? "—" },
    { label: "Ngày tạo", value: formatDate(req.createdAt) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/delivery-requests"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <span className="mr-2">←</span> Yêu cầu giao hàng
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Yêu cầu giao hàng
          </h1>
          <DeliveryStatusBadge status={req.status} />
        </div>
        {canCancel && (
          <Popconfirm
            title="Huỷ yêu cầu giao hàng?"
            description="Hành động này không thể hoàn tác."
            okText="Huỷ yêu cầu"
            cancelText="Đóng"
            okButtonProps={{ danger: true, loading: cancelling }}
            onConfirm={handleCancel}
          >
            <button
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              disabled={cancelling}
            >
              Huỷ yêu cầu
            </button>
          </Popconfirm>
        )}
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Thông tin giao hàng
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {infoRows.map((r) => (
            <div key={r.label} className="contents">
              <span className="text-gray-500">{r.label}</span>
              <span className="text-right font-medium text-gray-900">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Packages */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Kiện hàng ({req.packages.length})
        </h2>
        <ul className="divide-y divide-gray-100">
          {req.packages.map((p) => (
            <li
              key={p.packageId}
              className="flex items-center justify-between py-2.5"
            >
              <Link
                to={`/packages/${p.packageId}`}
                className="text-sm font-mono text-primary hover:underline"
              >
                {p.barcode}
              </Link>
              <PackageStatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      </div>

      {/* Waybills */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Vận đơn nội địa
        </h2>
        {req.waybills.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Chưa có vận đơn. Vận đơn được tạo sau khi yêu cầu được xác nhận.
          </p>
        ) : (
          <ul className="space-y-4">
            {req.waybills.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="text-sm font-mono font-medium text-gray-800">
                    {w.trackingNo}
                  </span>
                  <WaybillStatusBadge status={w.status} />
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-500">
                  <span>Đơn vị</span>
                  <span className="text-right text-gray-800">
                    {w.carrierName}
                  </span>
                  {w.carrierFeeVnd != null && (
                    <>
                      <span>Phí carrier</span>
                      <span className="text-right text-gray-800">
                        {formatVND(w.carrierFeeVnd)}
                      </span>
                    </>
                  )}
                  {w.deliveryAttemptCount > 0 && (
                    <>
                      <span>Số lần giao</span>
                      <span className="text-right text-gray-800">
                        {w.deliveryAttemptCount}
                      </span>
                    </>
                  )}
                  {w.failedReason && (
                    <>
                      <span>Lý do thất bại</span>
                      <span className="text-right text-red-600">
                        {w.failedReason}
                      </span>
                    </>
                  )}
                  {w.lastStatusAt && (
                    <>
                      <span>Cập nhật</span>
                      <span className="text-right text-gray-800">
                        {formatDate(w.lastStatusAt)}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
