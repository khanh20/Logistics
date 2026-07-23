import { authClient } from "./client";
import type { ApiResponse, Paginated } from "~/lib/types/common";

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const notificationApi = {
  getMine: (unreadOnly = false, page = 1, pageSize = 20) =>
    authClient.get<unknown, ApiResponse<Paginated<NotificationDto>>>("/api/notifications", {
      params: { unreadOnly, page, pageSize },
    }),

  getUnreadCount: () =>
    authClient.get<unknown, ApiResponse<number>>("/api/notifications/unread-count"),

  markRead: (id: string) =>
    authClient.patch<unknown, ApiResponse<unknown>>(`/api/notifications/${id}/read`),

  markAllRead: () =>
    authClient.post<unknown, ApiResponse<unknown>>("/api/notifications/mark-all-read"),
};
