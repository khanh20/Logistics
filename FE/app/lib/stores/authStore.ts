import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserAuthInfo } from "~/lib/types/auth";

interface AuthState {
  user: UserAuthInfo | null;
  token: string | null;
  refreshToken: string | null;
  roles: string[];
  permissions: string[];
  login: (token: string, refreshToken: string, user: UserAuthInfo) => void;
  logout: () => void;
  updateToken: (token: string) => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      roles: [],
      permissions: [],

      login: (token, refreshToken, user) =>
        set({ token, refreshToken, user, roles: user.roles, permissions: user.permissions }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, roles: [], permissions: [] }),

      updateToken: (token) => set({ token }),

      hasRole: (role) => get().roles.includes(role),

      hasPermission: (permission) => get().permissions.includes(permission),
    }),
    { name: "muaho-auth" }
  )
);
