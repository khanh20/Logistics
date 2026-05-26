export interface UserAuthInfo {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  user: UserAuthInfo;
}

export interface RefreshResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export type UserStatus = "Active" | "Banned" | "Suspended";

export interface StaffUserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  roles: string[];
}

// ── Role / Permission ─────────────────────────────────────────────────────────
export interface RoleResponse {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  scope: string;
  createdAt: string;
  permissions: string[];
}

export interface PermissionResponse {
  id: string;
  name: string;
  code: string;
  moduleName: string;
  description?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  scope: string;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
  scope: string;
}

export interface CreatePermissionRequest {
  name: string;
  code: string;
  moduleName: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  name: string;
  moduleName: string;
  description?: string;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// Tạo user với role do admin chọn
export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roleIds?: string[];
}

export interface UpdateStaffRequest {
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface RoleSlimResponse {
  id: string;
  name: string;
  scope: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

export interface PagedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
