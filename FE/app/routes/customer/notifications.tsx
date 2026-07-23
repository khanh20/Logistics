import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { notificationApi, type NotificationDto } from "~/lib/api/notification";
import { Button } from "~/components/ui/Button";
import { SectionHeader, EmptyState } from "~/components/shared/Panels";
import { SkeletonCards } from "~/components/shared/Skeleton";
import { Stagger, StaggerItem } from "~/components/shared/Motion";
import { Package, Hourglass, WarningCircle, ChatCircleDots, Bell, ArrowRight, CurrencyCircleDollar, ShieldCheck } from "~/components/shared/icons";
import { formatRelative } from "~/lib/utils/format";
import { cn } from "~/lib/utils/cn";
import { Pagination } from "antd";
import type { ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import { useAppDispatch } from "~/lib/feature/hooks";
import { fetchUnreadCount } from "~/lib/feature/notification/notificationThunk";

export function meta() {
  return [{ title: "Tất cả thông báo — MuaHo" }];
}

const ICON: Record<string, ComponentType<IconProps>> = {
  OrderAssigned: Package,
  SlaWarning: Hourglass,
  SlaOverdue: WarningCircle,
  ComplaintAssigned: ChatCircleDots,
  System: Bell,
  BalanceUpdate: CurrencyCircleDollar,
  WalletCreated: ShieldCheck,
  Promotion: Bell,
};

const ICON_TONE: Record<string, string> = {
  OrderAssigned: "text-blue-500",
  SlaWarning: "text-amber-500",
  SlaOverdue: "text-red-500",
  ComplaintAssigned: "text-purple-500",
  BalanceUpdate: "text-emerald-500",
  WalletCreated: "text-indigo-500",
  System: "text-slate-400",
};

export default function CustomerNotificationsPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [data, setData] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = async (p: number, s: number) => {
    setLoading(true);
    try {
      const res = await notificationApi.getMine(false, p, s);
      if (res.data) {
        // Handle C# backend serialization property 'data' vs typescript 'items'
        const items = (res.data as any).data || res.data.items || [];
        setData(items);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page, pageSize);
  }, [page, pageSize]);

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setData((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      dispatch(fetchUnreadCount());
    } catch (e) {
      console.error(e);
    }
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      setData((prev) => prev.map((n) => ({ ...n, isRead: true })));
      dispatch(fetchUnreadCount());
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen py-12 px-6 sm:px-8 bg-gray-50/50">
      <div className="max-w-4xl mx-auto space-y-6">
        <SectionHeader
          title="Tất cả thông báo"
          action={
            data.some((n) => !n.isRead) ? (
              <Button size="sm" variant="ghost" onClick={markAll}>
                Đánh dấu đã đọc tất cả
              </Button>
            ) : undefined
          }
        />

        {loading ? (
          <SkeletonCards count={5} />
        ) : data.length === 0 ? (
          <EmptyState icon={<Bell size={40} />} title="Bạn chưa có thông báo nào" />
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-4 sm:p-6 shadow-sm">
            <Stagger className="space-y-3">
              {data.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <StaggerItem key={n.id}>
                    <div
                      className={cn(
                        "flex items-start gap-4 rounded-xl p-4 transition-all duration-200 border border-transparent",
                        n.isRead
                          ? "bg-white hover:bg-slate-50 border-slate-100"
                          : "bg-blue-50/40 border-blue-100 shadow-[0_2px_10px_-4px_rgba(59,130,246,0.1)]"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 shrink-0 p-2 rounded-full",
                          n.isRead ? "bg-slate-100" : "bg-blue-100/50"
                        )}
                      >
                        <Icon size={24} weight={n.isRead ? "regular" : "duotone"} className={ICON_TONE[n.type] ?? "text-slate-400"} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                          <h4
                            className={cn(
                              "font-medium text-base truncate pr-4",
                              !n.isRead ? "text-gray-900 font-semibold" : "text-gray-700"
                            )}
                          >
                            {n.title}
                          </h4>
                          <span className="text-xs font-mono text-gray-400 shrink-0">
                            {formatRelative(n.createdAt)}
                          </span>
                        </div>
                        <p className={cn("text-sm leading-relaxed mb-2", !n.isRead ? "text-gray-700" : "text-gray-500")}>
                          {n.content}
                        </p>
                        
                        <div className="flex items-center gap-4 mt-2">
                          {n.referenceType === "Order" && n.referenceId && (
                            <Link
                              to={`/orders/${n.referenceId}`}
                              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              Xem đơn hàng <ArrowRight size={14} weight="bold" />
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              Đánh dấu đã đọc
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </Stagger>

            {totalCount > pageSize && (
              <div className="mt-8 flex justify-center border-t border-gray-100 pt-6">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={totalCount}
                  onChange={(p, s) => {
                    setPage(p);
                    setPageSize(s);
                  }}
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
