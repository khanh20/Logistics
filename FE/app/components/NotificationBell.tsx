import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bell, CheckCircle, Package, Info } from "@phosphor-icons/react";
import { Badge, Popover, Spin, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "~/lib/feature/hooks";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  fetchStaffNotifications,
  fetchStaffUnreadCount,
  markStaffNotificationRead,
  markAllStaffNotificationsRead,
} from "~/lib/feature/notification/notificationThunk";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export function NotificationBell({ type = "customer" }: { type?: "customer" | "staff" }) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  // Selector
  const { items, unreadCount, loading, staffItems, staffUnreadCount, staffLoading } = useAppSelector(
    (state) => state.notificationState
  );

  const notifications = (type === "customer" ? items : staffItems) || [];
  const count = type === "customer" ? unreadCount : staffUnreadCount;
  const isLoading = type === "customer" ? loading : staffLoading;

  useEffect(() => {
    // Initial fetch for count
    if (type === "customer") {
      dispatch(fetchUnreadCount());
    } else {
      dispatch(fetchStaffUnreadCount());
    }
  }, [dispatch, type]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      if (type === "customer") dispatch(fetchMyNotifications());
      else dispatch(fetchStaffNotifications());
    }
  };

  const handleMarkRead = (id: string) => {
    if (type === "customer") dispatch(markNotificationRead(id));
    else dispatch(markStaffNotificationRead(id));
  };

  const handleMarkAllRead = () => {
    if (type === "customer") dispatch(markAllNotificationsRead());
    else dispatch(markAllStaffNotificationsRead());
  };

  const getIcon = (itemType: string) => {
    if (itemType.includes("Order")) return <Package size={20} className="text-blue-500" />;
    return <Info size={20} className="text-gray-500" />;
  };

  const content = (
    <div className="w-80 max-h-[400px] flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="font-semibold text-gray-800">Thông báo</span>
        {count > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center p-8">
            <Spin size="small" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Bạn không có thông báo nào.
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id)}
                className={`flex gap-3 p-3 border-b border-gray-50 cursor-pointer transition-colors ${!n.isRead ? "bg-blue-50/50 hover:bg-blue-50" : "hover:bg-gray-50"
                  }`}
              >
                <div className="mt-1">{getIcon(n.type)}</div>
                <div className="flex-1">
                  <div className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                    {n.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 mb-1 line-clamp-2">
                    {("content" in n ? n.content : (n as any).body) || ""}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {dayjs(n.createdAt).fromNow()}
                  </div>
                </div>
                {!n.isRead && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nút Xem tất cả (Fixed bottom) */}
      <div className="border-t border-gray-100 p-2 bg-white shrink-0">
        <Link
          to={type === "customer" ? "/notifications" : "/staff/notifications"}
          onClick={() => setOpen(false)}
          className="block w-full text-center py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        >
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      align={{ offset: [250, 8] }}
      overlayInnerStyle={{ padding: 0, borderRadius: "12px", overflow: "hidden" }}
      arrow={false}
    >
      <div
        className={`relative p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center ${type === "customer"
          ? "text-red-100 hover:bg-white/10 hover:text-white"
          : "text-gray-600 hover:bg-gray-100"
          }`}
      >
        <Badge count={count} overflowCount={99} size="small" offset={[-2, 2]}>
          <Bell size={20} weight="regular" color={type === "customer" ? "#ffffff" : "currentColor"} />
        </Badge>
      </div>
    </Popover>
  );
}
