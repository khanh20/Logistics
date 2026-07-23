import { createAsyncThunk } from "@reduxjs/toolkit";
import { notificationApi } from "../../api/notification";
import { staffPortalApi } from "../../api/staff";
import { normalizeError } from "../../utils/errors";

// ── Customer Notifications ─────────────────────────────────────────

export const fetchMyNotifications = createAsyncThunk(
  "notification/fetchMyNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getMine(false, 1, 50);
      if (!response.data) throw new Error(response.message || "Failed to fetch notifications");
      const items = (response.data as any).data || response.data.items || [];
      return items;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notification/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationApi.getUnreadCount();
      return response.data ?? 0;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notification/markRead",
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationApi.markRead(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notification/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await notificationApi.markAllRead();
      return true;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

// ── Staff Notifications ────────────────────────────────────────────

export const fetchStaffNotifications = createAsyncThunk(
  "notification/fetchStaffNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const response = await staffPortalApi.getNotifications(false);
      if (!response.data) throw new Error(response.message || "Failed to fetch staff notifications");
      // Mảng trực tiếp hoặc nằm trong .data
      const items = Array.isArray(response.data) ? response.data : ((response.data as any).data || []);
      return items;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const fetchStaffUnreadCount = createAsyncThunk(
  "notification/fetchStaffUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await staffPortalApi.getUnreadCount();
      return response.data ?? 0;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const markStaffNotificationRead = createAsyncThunk(
  "notification/markStaffRead",
  async (id: string, { rejectWithValue }) => {
    try {
      await staffPortalApi.markRead(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);

export const markAllStaffNotificationsRead = createAsyncThunk(
  "notification/markAllStaffRead",
  async (_, { rejectWithValue }) => {
    try {
      await staffPortalApi.markAllRead();
      return true;
    } catch (err: unknown) {
      return rejectWithValue(normalizeError(err).message);
    }
  }
);
