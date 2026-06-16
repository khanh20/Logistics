import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ReduxStatus } from "../const";
import type { UserAuthInfo } from "../../types/auth";
import { login, register, logout, refreshToken } from "./authThunk";

interface AuthState {
  user: UserAuthInfo | null;
  token: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: string[];
  status: ReduxStatus;
  error: string | null;
}

// Initial state from localStorage if available (simple manual persistence)
const getInitialState = (): AuthState => {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      refreshToken: null,
      roles: [],
      permissions: [],
      status: ReduxStatus.IDLE,
      error: null,
    };
  }

  try {
    const saved = localStorage.getItem("muaho-auth");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        status: ReduxStatus.IDLE,
        error: null,
      };
    }
  } catch (e) {
    console.error("Failed to load auth from localStorage", e);
  }

  return {
    user: null,
    token: null,
    refreshToken: null,
    roles: [],
    permissions: [],
    status: ReduxStatus.IDLE,
    error: null,
  };
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      // Update persistence
      localStorage.setItem("muaho-auth", JSON.stringify(state));
    },
    updateUserLocal(state, action: PayloadAction<Partial<UserAuthInfo>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("muaho-auth", JSON.stringify(state));
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.status = ReduxStatus.LOADING;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = ReduxStatus.SUCCESS;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.roles = action.payload.user.roles;
        state.permissions = action.payload.user.permissions;
        localStorage.setItem("muaho-auth", JSON.stringify(state));
      })
      .addCase(login.rejected, (state, action) => {
        state.status = ReduxStatus.FAILURE;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.fulfilled, (state, action) => {
        state.status = ReduxStatus.SUCCESS;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.roles = action.payload.user.roles;
        state.permissions = action.payload.user.permissions;
        localStorage.setItem("muaho-auth", JSON.stringify(state));
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.roles = [];
        state.permissions = [];
        state.status = ReduxStatus.IDLE;
        localStorage.removeItem("muaho-auth");
      })
      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        localStorage.setItem("muaho-auth", JSON.stringify(state));
      });
  },
});

export const { clearAuthError, setToken, updateUserLocal } = authSlice.actions;
export default authSlice.reducer;
