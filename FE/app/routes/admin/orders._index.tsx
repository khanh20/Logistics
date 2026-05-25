import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/orders._index";
import { manageOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { ORDER_STATUSES } from "~/lib/constants/orderStatus";
import type { StaffOrderListItemResponse, OrderStatus } from "~/lib/types/order";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý đơn hàng — MuaHo Admin" }];
}

const PAGE_SIZE = 20;

export async function clientLoader() {
  const res = await manageOrdersApi.list({ page: 1, pageSize: PAGE_SIZE });
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

export default function AdminOrdersPage({
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

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const doSearch = useCallback(
    async (p: number, status: OrderStatus | "", from: string, to: string) => {
      setLoading(true);
      try {
        const res = await manageOrdersApi.list({
          status: status || undefined,
          fromDate: from || undefined,
          toDate: to || undefined,
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    await doSearch(1, statusFilter, fromDate, toDate);
  }

  async function handleReset() {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    await doSearch(1, "", "", "");
  }

  async function handlePage(p: number) {
    setPage(p);
    await doSearch(p, statusFilter, fromDate, toDate);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.orders")}</h1>
        <span className="text-sm text-gray-500">{t("order.count_orders", { count: totalCount })}</span>
      </div>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{t("common.status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("order.all_statuses")}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`order.status.${s}`)}
                </option>
              ))}
            </select>
          </div>

          {/* From date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{t("order.from_date")}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* To date */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{t("order.to_date")}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            {t("common.reset")}
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            {t("common.search")}
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">{t("order.col_code")}</th>
                <th className="px-4 py-3 text-left">{t("order.col_shop")}</th>
                <th className="px-4 py-3 text-center">{t("common.status")}</th>
                <th className="px-4 py-3 text-right">{t("order.col_amount")}</th>
                <th className="px-4 py-3 text-right">{t("order.col_deposit")}</th>
                <th className="px-4 py-3 text-left">{t("common.created_at")}</th>
                <th className="px-4 py-3 text-center">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700">
                      {order.orderCode}
                    </span>
                    {order.placementMode === "ShopifyAuto" && (
                      <span className="ml-1.5 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        Auto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-800 font-medium truncate max-w-[160px]">
                      {order.shopName}
                    </p>
                    {order.assignedStaffId && (
                      <p className="text-xs text-gray-400 truncate">
                        {t("order.staff_short")}: {order.assignedStaffId.slice(0, 8)}…
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">
                    {formatCNY(order.totalCny)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-800">
                    {formatVND(order.depositVnd)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      {t("order.process_btn")}
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
            {t("order.pagination", { page, total: totalPages, count: totalCount })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
            >
              {t("common.prev_page")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePage(page + 1)}
            >
              {t("common.next_page")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
