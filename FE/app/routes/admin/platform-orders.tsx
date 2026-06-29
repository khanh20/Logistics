import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/platform-orders";
import { manageOrdersApi } from "~/lib/api/orders";
import { StatusBadge } from "~/components/shared/StatusBadge";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonPanel } from "~/components/shared/Skeleton";
import { FadeIn } from "~/components/shared/Motion";
import { Button } from "~/components/ui/Button";
import { Package, CaretLeft, CaretRight, Eye, WarningCircle } from "~/components/shared/icons";
import { useFetch } from "~/lib/hooks/useFetch";
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

export default function PlatformOrdersPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("OrderedOnPlatform");
  const [page, setPage] = useState(1);

  const { data, loading, error } = useFetch<{
    items: StaffOrderListItemResponse[];
    totalCount: number;
    totalPages: number;
  }>(async () => {
    const res = await manageOrdersApi.list({ status: statusFilter, page, pageSize: PAGE_SIZE });
    return {
      items: res.data.items as StaffOrderListItemResponse[],
      totalCount: res.data.totalCount,
      totalPages: res.data.totalPages,
    };
  }, [statusFilter, page]);

  function handleStatusChange(s: OrderStatus) {
    setStatusFilter(s);
    setPage(1);
  }

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <FadeIn className="space-y-6">
      <SectionHeader
        title={t("nav.platform_orders")}
        subtitle={t("order.count_orders", { count: totalCount })}
      />

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {PLATFORM_ORDER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95",
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t(`order.status.${s}`)}
          </button>
        ))}
      </div>

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
        <EmptyState icon={<Package size={40} />} title={t("common.no_data")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t("platform_orders.col_code", "Mã đơn MuaHo")}</th>
                  <th className="px-4 py-3 text-left font-medium">Shop</th>
                  <th className="px-4 py-3 text-center font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("platform_orders.col_mode", "Cách đặt")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("platform_orders.col_staff", "NV phụ trách")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.created_at")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700">{order.orderCode}</span>
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-slate-800">{order.shopName}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          order.placementMode === "ShopifyAuto"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {order.placementMode === "ShopifyAuto"
                          ? t("platform_orders.mode_auto", "Auto")
                          : t("platform_orders.mode_manual", "Manual")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {order.assignedStaffId ? order.assignedStaffId.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-white active:scale-[0.98]"
                      >
                        <Eye size={13} />
                        {t("common.view", "Xem")}
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
            <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="gap-1">
              <CaretLeft size={14} weight="bold" />
              {t("common.prev_page")}
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)} className="gap-1">
              {t("common.next_page")}
              <CaretRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      )}
    </FadeIn>
  );
}
