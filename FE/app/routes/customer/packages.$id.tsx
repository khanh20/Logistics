import { Link, redirect } from "react-router";
import { store } from "~/lib/feature/store";
import { myPackagesApi } from "~/lib/api/logistics";
import { PackageStatusBadge } from "~/components/shared/PackageStatusBadge";
import { PackageTimeline } from "~/components/customer/PackageTimeline";
import { formatWeight, formatDate } from "~/lib/utils/format";
import {
  PACKAGING_TYPE_LABEL,
  INSURANCE_LEVEL_LABEL,
} from "~/lib/constants/logistics";
import type { PackageSummary, TrackingEvent } from "~/lib/types/logistics";
import type { Route } from "./+types/packages.$id";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Chi tiết kiện hàng — MuaHo" }];
}

// BE chưa có endpoint detail cho khách → lấy summary từ list + gọi tracking.
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const [listRes, trackingRes] = await Promise.all([
    myPackagesApi.list(),
    myPackagesApi.getTracking(params.id!),
  ]);

  const pkg = (listRes.data ?? []).find((p) => p.id === params.id);
  if (!pkg) {
    throw new Response("Không tìm thấy kiện hàng", { status: 404 });
  }

  return { pkg, tracking: trackingRes.data ?? [] };
}

export default function CustomerPackageDetailPage({
  loaderData,
}: {
  loaderData: { pkg: PackageSummary; tracking: TrackingEvent[] };
}) {
  const { pkg, tracking } = loaderData;

  const dims: { label: string; value: string }[] = [
    {
      label: "Cân thực tế",
      value: pkg.actualWeightKg != null ? formatWeight(pkg.actualWeightKg) : "—",
    },
    {
      label: "Cân tính cước",
      value:
        pkg.chargedWeightKg != null ? formatWeight(pkg.chargedWeightKg) : "—",
    },
    {
      label: "Loại đóng gói",
      value: PACKAGING_TYPE_LABEL[pkg.packagingType] ?? pkg.packagingType,
    },
    {
      label: "Bảo hiểm",
      value: pkg.insuranceOpted
        ? pkg.insuranceLevel
          ? INSURANCE_LEVEL_LABEL[pkg.insuranceLevel]
          : "Có"
        : "Không",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back */}
      <Link
        to="/packages"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <span className="mr-2">←</span> Kiện hàng của tôi
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-mono text-gray-400 mb-1">{pkg.barcode}</p>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết kiện hàng</h1>
        </div>
        <PackageStatusBadge status={pkg.status} />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Thông tin kiện
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {dims.map((d) => (
            <div key={d.label} className="contents">
              <span className="text-gray-500">{d.label}</span>
              <span className="text-right font-medium text-gray-900">
                {d.value}
              </span>
            </div>
          ))}
          <span className="text-gray-500">Ngày tạo</span>
          <span className="text-right font-medium text-gray-900">
            {formatDate(pkg.createdAt)}
          </span>
          {pkg.orderId && (
            <>
              <span className="text-gray-500">Đơn hàng</span>
              <Link
                to={`/orders/${pkg.orderId}`}
                className="text-right font-medium text-primary hover:underline"
              >
                Xem đơn →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">
          Hành trình kiện hàng
        </h2>
        <PackageTimeline events={tracking} />
      </div>
    </div>
  );
}
