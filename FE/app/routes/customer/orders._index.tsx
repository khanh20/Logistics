import { useState } from "react";
import { Link, redirect } from "react-router";
import { useTranslation } from "react-i18next";
import { store } from "~/lib/feature/store";
import { customerOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { Button } from "~/components/ui/Button";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { CUSTOMER_CANCELLABLE_STATUSES } from "~/lib/constants/orderStatus";
import type { OrderListItemResponse, OrderStatus } from "~/lib/types/order";
import type { Route } from "./+types/orders._index";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Đơn mua hộ — MuaHo" }];
}

const PAGE_SIZE = 10;

export async function clientLoader() {
  const { token } = store.getState().authState;
  if (!token) throw redirect("/login");

  const res = await customerOrdersApi.list({ page: 1, pageSize: PAGE_SIZE });
  return {
    items: res.data.items as OrderListItemResponse[],
    totalCount: res.data.totalCount,
    totalPages: res.data.totalPages,
  };
}

type LoaderData = {
  items: OrderListItemResponse[];
  totalCount: number;
  totalPages: number;
};

export default function CustomerOrdersPage({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(loaderData.items);
  const [totalPages, setTotalPages] = useState(loaderData.totalPages);
  const [totalCount, setTotalCount] = useState(loaderData.totalCount);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function fetchOrders(p: number, status: OrderStatus | "") {
    setLoading(true);
    try {
      const res = await customerOrdersApi.list({
        status: status || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.totalCount);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(val: OrderStatus | "") {
    setStatusFilter(val);
    setPage(1);
    await fetchOrders(1, val);
  }

  async function handlePage(p: number) {
    setPage(p);
    await fetchOrders(p, statusFilter);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("order.my_orders")}</h1>
        <span className="text-sm text-gray-400">{t("order.count_orders", { count: totalCount })}</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => handleStatusChange("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            statusFilter === ""
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t("order.all_statuses")}
        </button>
        {(["PendingPayment", "Paid", "AwaitingManualPlace", "OrderedOnPlatform",
           "ShippedFromShop", "ArrivedChinaWh", "ShippingToVN", "ArrivedVietnam",
           "Delivering", "Completed", "CancelledByCustomer", "CancelledByTimeout",
           "Returned"] as OrderStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <StatusBadge status={s} />
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-gray-500">{t("order.empty")}</p>
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            {t("common.browse_products")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((order) => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  {order.thumbnailUrl ? (
                    <img
                      src={order.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      📦
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {order.orderCode}
                    </span>
                    <StatusBadge status={order.status} />
                    {CUSTOMER_CANCELLABLE_STATUSES.includes(order.status) && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                        {t("order.can_cancel")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {order.shopName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t("order.item_count", { count: order.itemCount })} · {formatDate(order.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCNY(order.totalCny)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("order.deposit_short", { amount: formatVND(order.depositVnd) })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
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
