import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../api/auth";
import type { LoginRequest, RegisterRequest } from "../../types/auth";

export const login = createAsyncThunk(
  "auth/login",
  async (data: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.login(data);
      if (!response.data) throw new Error(response.message || "Login failed");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authApi.register(data);
      if (!response.data) throw new Error(response.message || "Registration failed");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      await authApi.logout(refreshToken);
      return null;
    } catch (err: any) {
      return rejectWithValue(err.message || "Logout failed");
    }
  }
);

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await authApi.refresh(token);
      if (!response.data) throw new Error(response.message || "Token refresh failed");
      return response.data;
    } catch (err: any) {
      return rejectWithValue(err.message || "Something went wrong");
    }
  }
);
