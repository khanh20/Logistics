import { useMemo, useState } from "react";
import { Link, redirect } from "react-router";
import { store } from "~/lib/feature/store";
import { myPackagesApi } from "~/lib/api/logistics";
import { PackageStatusBadge } from "~/components/shared/PackageStatusBadge";
import { formatWeight, formatDate } from "~/lib/utils/format";
import {
  PACKAGE_STATUSES,
  PACKAGE_STATUS_LABEL,
  PACKAGING_TYPE_LABEL,
} from "~/lib/constants/logistics";
import type { PackageSummary, PackageStatus } from "~/lib/types/logistics";
import type { Route } from "./+types/packages._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Kiện hàng của tôi — MuaHo" }];
}

export async function clientLoader() {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await myPackagesApi.list();
  return { items: res.data ?? [] };
}

export default function CustomerPackagesPage({
  loaderData,
}: {
  loaderData: { items: PackageSummary[] };
}) {
  const { items } = loaderData;
  const [statusFilter, setStatusFilter] = useState<PackageStatus | "">("");

  // Chỉ hiển thị tab cho status thực sự xuất hiện trong danh sách
  const presentStatuses = useMemo(() => {
    const set = new Set(items.map((p) => p.status));
    return PACKAGE_STATUSES.filter((s) => set.has(s));
  }, [items]);

  const filtered = useMemo(
    () => (statusFilter ? items.filter((p) => p.status === statusFilter) : items),
    [items, statusFilter]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kiện hàng của tôi</h1>
        <span className="text-sm text-gray-400">{items.length} kiện</span>
      </div>

      {/* Status filter tabs */}
      {presentStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === ""
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả
          </button>
          {presentStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PACKAGE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500">
            {items.length === 0
              ? "Bạn chưa có kiện hàng nào đang vận chuyển."
              : "Không có kiện hàng ở trạng thái này."}
          </p>
          <Link
            to="/orders"
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            Xem đơn mua hộ →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pkg) => (
            <Link
              key={pkg.id}
              to={`/packages/${pkg.id}`}
              className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-xl">
                  📦
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {pkg.barcode}
                    </span>
                    <PackageStatusBadge status={pkg.status} />
                    {pkg.insuranceOpted && (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5">
                        Có bảo hiểm
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    Đóng gói: {PACKAGING_TYPE_LABEL[pkg.packagingType] ?? pkg.packagingType}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tạo ngày {formatDate(pkg.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {pkg.chargedWeightKg != null
                      ? formatWeight(pkg.chargedWeightKg)
                      : "—"}
                  </p>
                  <p className="text-xs text-gray-400">cân tính cước</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
