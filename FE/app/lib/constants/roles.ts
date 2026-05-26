export const ROLES = {
  ADMIN:       "Admin",
  NV_MUA_HANG: "NV_MuaHang",
  NV_KHO:      "NV_Kho",
  KE_TOAN:     "KeToan",
  KHACH_HANG:  "KhachHang",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: Role[] = [
  ROLES.ADMIN,
  ROLES.NV_MUA_HANG,
  ROLES.NV_KHO,
  ROLES.KE_TOAN,
];

export const ADMIN_ONLY_ROLES: Role[] = [ROLES.ADMIN];

export function isStaff(roles: string[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r as Role));
}

export function isAdmin(roles: string[]): boolean {
  return roles.includes(ROLES.ADMIN);
}
