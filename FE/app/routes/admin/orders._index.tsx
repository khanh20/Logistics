import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/orders._index";
import { manageOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Button } from "~/components/ui/Button";
import { Funnel, ArrowClockwise, CaretLeft, CaretRight, ArrowRight, Receipt, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
import { formatCNY, formatVND, formatDate } from "~/lib/utils/format";
import { ORDER_STATUSES } from "~/lib/constants/orderStatus";
import type { StaffOrderListItemResponse, OrderStatus } from "~/lib/types/order";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Quản lý đơn hàng — MuaHo Admin" }];
}

const PAGE_SIZE = 20;

type OrdersResult = {
  items: StaffOrderListItemResponse[];
  totalCount: number;
  totalPages: number;
};

export default function AdminOrdersPage() {
  const { t } = useTranslation();

  // Filters (committed = bộ lọc đã áp dụng → dùng làm deps cho useFetch)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [committed, setCommitted] = useState({ status: "" as OrderStatus | "", from: "", to: "", page: 1 });

  const { data, loading, error, reload } = useFetch<OrdersResult>(async () => {
    const res = await manageOrdersApi.list({
      status: committed.status || undefined,
      fromDate: committed.from || undefined,
      toDate: committed.to || undefined,
      page: committed.page,
      pageSize: PAGE_SIZE,
    });
    return {
      items: res.data.items as StaffOrderListItemResponse[],
      totalCount: res.data.totalCount,
      totalPages: res.data.totalPages,
    };
  }, [committed]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setCommitted({ status: statusFilter, from: fromDate, to: toDate, page: 1 });
  }

  function handleReset() {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setCommitted({ status: "", from: "", to: "", page: 1 });
  }

  function handlePage(p: number) {
    setPage(p);
    setCommitted((c) => ({ ...c, page: p }));
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalCount = data?.totalCount ?? 0;

  return (
    <FadeIn className="space-y-6">
      <SectionHeader
        title={t("nav.orders")}
        subtitle={t("order.count_orders", { count: totalCount })}
        action={
          <Button variant="secondary" size="sm" onClick={reload} className="gap-1.5">
            <ArrowClockwise size={16} weight="bold" />
            {t("common.refresh", "Tải lại")}
          </Button>
        }
      />

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t("common.status")}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t("order.all_statuses")}</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`order.status.${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t("order.from_date")}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">{t("order.to_date")}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
            {t("common.reset")}
          </Button>
          <Button type="submit" size="sm" loading={loading} className="gap-1.5">
            <Funnel size={16} weight="bold" />
            {t("common.search")}
          </Button>
        </div>
      </form>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <WarningCircle size={18} weight="fill" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading && !data ? (
        <SkeletonPanel rows={8} cols={7} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Receipt size={40} />}
          title={t("common.no_data")}
          hint={t("order.empty_hint", "Thử đổi bộ lọc trạng thái hoặc khoảng ngày.")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("order.col_code")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("order.col_shop")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("order.col_amount")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("order.col_deposit")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.created_at")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700">{order.orderCode}</span>
                      {order.placementMode === "ShopifyAuto" && (
                        <span className="ml-1.5 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">
                          Auto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[160px] truncate font-medium text-slate-800">
                        {order.shopName}
                      </p>
                      {order.assignedStaffId && (
                        <p className="truncate text-xs text-slate-400">
                          {t("order.staff_short")}: {order.assignedStaffId.slice(0, 8)}…
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {formatCNY(order.totalCny)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-800">
                      {formatVND(order.depositVnd)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-dark active:scale-[0.98]"
                      >
                        {t("order.process_btn")}
                        <ArrowRight size={13} weight="bold" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t("order.pagination", { page, total: totalPages, count: totalCount })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => handlePage(page - 1)}
              className="gap-1"
            >
              <CaretLeft size={14} weight="bold" />
              {t("common.prev_page")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => handlePage(page + 1)}
              className="gap-1"
            >
              {t("common.next_page")}
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      )}
    </FadeIn>
  );
}
