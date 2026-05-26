import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Selectors cơ bản
export const selectAuth = (state: RootState) => state.authState;

export const selectUser = createSelector(
  [selectAuth],
  (auth) => auth.user
);

export const selectToken = createSelector(
  [selectAuth],
  (auth) => auth.token
);

export const selectPermissions = createSelector(
  [selectAuth],
  (auth) => auth.permissions || []
);

// Chuyển đổi permissions sang Set để tối ưu tốc độ tìm kiếm 
const selectPermissionSet = createSelector(
  [selectPermissions],
  (permissions) => new Set(permissions)
);

//Kiểm tra xem người dùng có một quyền cụ thể nào không
export const selectIsGranted = createSelector(
  [selectPermissionSet, (_: RootState, permission: string) => permission],
  (permissionSet, permission) => permissionSet.has(permission)
);

// Kiểm tra xem người dùng có bất kỳ quyền nào trong danh sách không
export const selectHasAnyPermission = createSelector(
  [selectPermissionSet, (_: RootState, permissions: string[]) => permissions],
  (permissionSet, requiredPermissions) => requiredPermissions.some(p => permissionSet.has(p))
);
