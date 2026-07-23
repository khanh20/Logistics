import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  fetchStaffNotifications,
  fetchStaffUnreadCount,
  markStaffNotificationRead,
  markAllStaffNotificationsRead,
} from "./notificationThunk";
import type { NotificationDto } from "../../api/notification";
import type { StaffNotificationDto } from "../../types/staff";

interface NotificationState {
  // Customer
  items: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  
  // Staff
  staffItems: StaffNotificationDto[];
  staffUnreadCount: number;
  staffLoading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  loading: false,
  staffItems: [],
  staffUnreadCount: 0,
  staffLoading: false,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    // Actions called by SignalR
    receiveNotification: (state, action: PayloadAction<NotificationDto>) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    receiveStaffNotification: (state, action: PayloadAction<StaffNotificationDto>) => {
      state.staffItems.unshift(action.payload);
      state.staffUnreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    // Customer
    builder.addCase(fetchMyNotifications.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMyNotifications.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload;
    });
    builder.addCase(fetchMyNotifications.rejected, (state) => {
      state.loading = false;
    });

    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const item = state.items.find((x) => x.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      state.items.forEach((x) => (x.isRead = true));
      state.unreadCount = 0;
    });

    // Staff
    builder.addCase(fetchStaffNotifications.pending, (state) => {
      state.staffLoading = true;
    });
    builder.addCase(fetchStaffNotifications.fulfilled, (state, action) => {
      state.staffLoading = false;
      state.staffItems = action.payload;
    });
    builder.addCase(fetchStaffNotifications.rejected, (state) => {
      state.staffLoading = false;
    });

    builder.addCase(fetchStaffUnreadCount.fulfilled, (state, action) => {
      state.staffUnreadCount = action.payload;
    });

    builder.addCase(markStaffNotificationRead.fulfilled, (state, action) => {
      const item = state.staffItems.find((x) => x.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.staffUnreadCount = Math.max(0, state.staffUnreadCount - 1);
      }
    });

    builder.addCase(markAllStaffNotificationsRead.fulfilled, (state) => {
      state.staffItems.forEach((x) => (x.isRead = true));
      state.staffUnreadCount = 0;
    });
  },
});

export const { receiveNotification, receiveStaffNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
