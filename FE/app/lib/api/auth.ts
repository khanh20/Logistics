import { authClient } from "./client";
import type { ApiResponse } from "~/lib/types/common";
import type {
  AssignRoleRequest,
  AuthResponse,
  CreatePermissionRequest,
  CreateRoleRequest,
  CreateStaffRequest,
  CreateUserRequest,
  LoginRequest,
  PagedResponse,
  PermissionResponse,
  RefreshResponse,
  RegisterRequest,
  RoleResponse,
  RoleSlimResponse,
  StaffUserDto,
  UpdatePermissionRequest,
  UpdateRoleRequest,
  UpdateStaffRequest,
  UserStatus,
} from "~/lib/types/auth";

export const authApi = {
  login: (body: LoginRequest) =>
    authClient.post<unknown, ApiResponse<AuthResponse>>("/api/auth/login", body),

  register: (body: RegisterRequest) =>
    authClient.post<unknown, ApiResponse<AuthResponse>>("/api/auth/register", body),

  refresh: (refreshToken: string) =>
    authClient.post<unknown, ApiResponse<RefreshResponse>>("/api/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    authClient.post<unknown, ApiResponse<null>>("/api/auth/logout", { refreshToken }),

  updateMe: (body: { fullName: string; phone?: string; avatarUrl?: string }) =>
    authClient.put<unknown, ApiResponse<any>>("/api/users/me", body),
};

export const usersApi = {
  // Lấy TẤT CẢ user (không lọc theo role)
  getAll: (page = 1, pageSize = 200) =>
    authClient.get<unknown, ApiResponse<PagedResponse<StaffUserDto>>>(
      `/api/users?page=${page}&pageSize=${pageSize}`
    ),

  // Tạo user với role do admin chọn
  createUser: (body: CreateUserRequest) =>
    authClient.post<unknown, ApiResponse<StaffUserDto>>("/api/users", body),

  // Cập nhật profile (fullName, phone)
  updateStaff: (id: string, body: UpdateStaffRequest) =>
    authClient.put<unknown, ApiResponse<StaffUserDto>>(`/api/users/${id}`, body),

  // Cập nhật trạng thái: Active / Banned / Suspended
  updateStatus: (id: string, status: UserStatus) =>
    authClient.patch<unknown, ApiResponse<StaffUserDto>>(`/api/users/${id}/status`, { status }),
};

export const rolesApi = {
  getAll: () =>
    authClient.get<unknown, ApiResponse<RoleResponse[]>>("/api/roles"),

  getById: (id: string) =>
    authClient.get<unknown, ApiResponse<RoleResponse>>(`/api/roles/${id}`),

  create: (body: CreateRoleRequest) =>
    authClient.post<unknown, ApiResponse<RoleResponse>>("/api/roles", body),

  update: (id: string, body: UpdateRoleRequest) =>
    authClient.put<unknown, ApiResponse<RoleResponse>>(`/api/roles/${id}`, body),

  delete: (id: string) =>
    authClient.delete<unknown, ApiResponse<null>>(`/api/roles/${id}`),

  // Lấy roles của một user cụ thể
  getUserRoles: (userId: string) =>
    authClient.get<unknown, ApiResponse<RoleSlimResponse[]>>(`/api/roles/user/${userId}`),

  // Gán role cho user
  assignRole: (body: AssignRoleRequest) =>
    authClient.post<unknown, ApiResponse<null>>("/api/roles/assign", body),

  // Xóa role khỏi user
  removeRole: (body: AssignRoleRequest) =>
    authClient.post<unknown, ApiResponse<null>>("/api/roles/remove", body),
};

export const permissionsApi = {
  getAll: () =>
    authClient.get<unknown, ApiResponse<PermissionResponse[]>>("/api/permissions"),

  getByRole: (roleId: string) =>
    authClient.get<unknown, ApiResponse<PermissionResponse[]>>(`/api/permissions/role/${roleId}`),

  syncRolePermissions: (roleId: string, permissionCodes: string[]) =>
    authClient.put<unknown, ApiResponse<null>>("/api/permissions/role/sync", { roleId, permissionCodes }),

  create: (body: CreatePermissionRequest) =>
    authClient.post<unknown, ApiResponse<PermissionResponse>>("/api/permissions", body),

  update: (id: string, body: UpdatePermissionRequest) =>
    authClient.put<unknown, ApiResponse<PermissionResponse>>(`/api/permissions/${id}`, body),

  delete: (id: string) =>
    authClient.delete<unknown, ApiResponse<null>>(`/api/permissions/${id}`),
};
