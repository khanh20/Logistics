import { useAuthStore } from "~/lib/stores/authStore";
import { isStaff, isAdmin } from "~/lib/constants/roles";

export function useAuth() {
  const { user, token, roles, permissions, login, logout, hasRole, hasPermission } =
    useAuthStore();

  return {
    user,
    token,
    isAuthenticated: !!token,
    roles,
    permissions,
    login,
    logout,
    hasRole,
    hasPermission,
    isAdmin: isAdmin(roles),
    isStaff: isStaff(roles),
  };
}
