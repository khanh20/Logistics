export const ROLES = {
  ADMIN:       "Admin",
  NV_MUA_HANG: "NV_MuaHang",
  NV_KHO:      "NV_Kho",
  KE_TOAN:     "KeToan",
  NV_CSKH:     "NV_CSKH",
  KHACH_HANG:  "KhachHang",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.NV_MUA_HANG,
  ROLES.NV_KHO,
  ROLES.KE_TOAN,
  ROLES.NV_CSKH,
];

// Roles được phép vào Portal Nhân viên (/staff).
export const PORTAL_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.NV_MUA_HANG,
  ROLES.NV_CSKH,
  ROLES.NV_KHO,
  ROLES.KE_TOAN,
];

export const ADMIN_ONLY_ROLES: Role[] = [ROLES.ADMIN];

// Nhân viên có thể được phân công
export const ASSIGNABLE_ROLES: Role[] = [
  ROLES.NV_MUA_HANG,
  ROLES.NV_KHO,
  ROLES.KE_TOAN,
  ROLES.NV_CSKH,
];

export function isAssignable(roles: string[]): boolean {
  return roles.some((r) => ASSIGNABLE_ROLES.includes(r as Role));
}

export function isCskh(roles: string[]): boolean {
  return roles.includes(ROLES.NV_CSKH) || roles.includes(ROLES.ADMIN);
}

export function isStaff(roles: string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r as Role));
}

export function isAdmin(roles: string[]): boolean {
  return roles.includes(ROLES.ADMIN);
}
