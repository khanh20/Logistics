import { useAppSelector } from "~/lib/feature/hooks";
import { isStaff, isAdmin } from "~/lib/constants/roles";

export function useAuth() {
  const { user, token, roles, permissions } = useAppSelector((state) => state.authState);

  const hasRole = (role: string) => roles.includes(role);
  const hasPermission = (permission: string) => permissions.includes(permission);

  return {
    user,
    token,
    isAuthenticated: !!token,
    roles,
    permissions,
    hasRole,
    hasPermission,
    isAdmin: isAdmin(roles),
    isStaff: isStaff(roles),
  };
}
