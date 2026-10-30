import { StaffRole } from '@prisma/client';

export type StaffPrincipal = {
  kind: 'staff';
  sub: string; // staffId
  storeId: string;
  role: StaffRole;
  deviceId?: string;
};

/** Thiết bị dùng chung của quán đã đăng nhập, chưa biết nhân viên nào đang cầm. */
export type DevicePrincipal = {
  kind: 'device';
  sub: string; // deviceId
  storeId: string;
};

export type CustomerPrincipal = {
  kind: 'customer';
  storeId: string;
  tableId: string;
  sessionId: string;
};

/** Quản trị hệ thống (A1): không gắn với cửa hàng nào. */
export type PlatformPrincipal = {
  kind: 'platform';
  sub: string; // platformAdminId
};

export type Principal = StaffPrincipal | DevicePrincipal | CustomerPrincipal | PlatformPrincipal;
