import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/platform-orders";
import { manageOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { Button } from "~/components/ui/Button";
import { formatDate } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import type { StaffOrderListItemResponse, OrderStatus } from "~/lib/types/order";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đơn trên sàn — MuaHo Admin" }];
}

// Statuses where we expect a platform order to exist
const PLATFORM_ORDER_STATUSES: OrderStatus[] = [
  "OrderedOnPlatform",
  "ShippedFromShop",
  "ArrivedChinaWh",
  "ShippingToVN",
  "ArrivedVietnam",
  "Delivering",
  "Completed",
  "Returned",
];

const PAGE_SIZE = 20;

export async function clientLoader() {
  // Load first batch — orders that have been placed on platform
  const res = await manageOrdersApi.list({
    status: "OrderedOnPlatform",
    page: 1,
    pageSize: PAGE_SIZE,
  });
  return {
    items: res.data.items as StaffOrderListItemResponse[],
    totalCount: res.data.totalCount,
    totalPages: res.data.totalPages,
  };
}

type LoaderData = {
  items: StaffOrderListItemResponse[];
  totalCount: number;
  totalPages: number;
};

export default function PlatformOrdersPage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(loaderData.items);
  const [totalPages, setTotalPages] = useState(loaderData.totalPages);
  const [totalCount, setTotalCount] = useState(loaderData.totalCount);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("OrderedOnPlatform");

  const doSearch = useCallback(
    async (p: number, status: OrderStatus) => {
      setLoading(true);
      try {
        const res = await manageOrdersApi.list({
          status,
          page: p,
          pageSize: PAGE_SIZE,
        });
        setItems(res.data.items);
        setTotalPages(res.data.totalPages);
        setTotalCount(res.data.totalCount);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  async function handleStatusChange(s: OrderStatus) {
    setStatusFilter(s);
    setPage(1);
    await doSearch(1, s);
  }

  async function handlePage(p: number) {
    setPage(p);
    await doSearch(p, statusFilter);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("nav.platform_orders")}
        </h1>
        <span className="text-sm text-gray-400">{totalCount} đơn</span>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PLATFORM_ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <StatusBadge status={s} />
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Mã đơn MuaHo</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-left">Cách đặt</th>
                <th className="px-4 py-3 text-left">NV phụ trách</th>
                <th className="px-4 py-3 text-left">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700">
                      {order.orderCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-[140px] truncate">
                    {order.shopName}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        order.placementMode === "ShopifyAuto"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {order.placementMode === "ShopifyAuto" ? "🤖 Auto" : "👤 Manual"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.assignedStaffId
                      ? order.assignedStaffId.slice(0, 8) + "…"
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && !loading && (
          <p className="text-center text-gray-400 py-12">{t("common.no_data")}</p>
        )}
        {loading && (
          <p className="text-center text-gray-400 py-12">{t("common.loading")}</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Trang {page}/{totalPages} — {totalCount} đơn
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
            >
              ← Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePage(page + 1)}
            >
              Tiếp →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
