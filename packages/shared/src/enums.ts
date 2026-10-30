/** Trạng thái dùng chung cho API và frontend. Phải khớp enum trong prisma/schema.prisma. */

export const StaffRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  WAITER: 'WAITER',
  KITCHEN: 'KITCHEN',
  CASHIER: 'CASHIER',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const Station = { KITCHEN: 'KITCHEN', BAR: 'BAR' } as const;
export type Station = (typeof Station)[keyof typeof Station];

export const TableStatus = { FREE: 'FREE', OCCUPIED: 'OCCUPIED', LOCKED: 'LOCKED' } as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const SessionStatus = { OPEN: 'OPEN', CLOSED: 'CLOSED' } as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const OrderSource = { CUSTOMER: 'CUSTOMER', STAFF: 'STAFF' } as const;
export type OrderSource = (typeof OrderSource)[keyof typeof OrderSource];

export const OrderStatus = {
  PENDING_CONFIRM: 'PENDING_CONFIRM',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const KitchenStatus = {
  QUEUED: 'QUEUED',
  COOKING: 'COOKING',
  DONE: 'DONE',
  SERVED: 'SERVED',
} as const;
export type KitchenStatus = (typeof KitchenStatus)[keyof typeof KitchenStatus];

export const BillStatus = { OPEN: 'OPEN', PAID: 'PAID', VOID: 'VOID' } as const;
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  VIETQR: 'VIETQR',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = { PENDING: 'PENDING', PAID: 'PAID', FAILED: 'FAILED' } as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ServiceRequestType = { CALL_WAITER: 'CALL_WAITER', REQUEST_BILL: 'REQUEST_BILL' } as const;
export type ServiceRequestType = (typeof ServiceRequestType)[keyof typeof ServiceRequestType];

export const SessionOpenMode = { ON_SCAN: 'ON_SCAN', BY_STAFF: 'BY_STAFF' } as const;
export type SessionOpenMode = (typeof SessionOpenMode)[keyof typeof SessionOpenMode];

export const Plan = { FREE: 'FREE', BASIC: 'BASIC', PRO: 'PRO', CHAIN: 'CHAIN' } as const;
export type Plan = (typeof Plan)[keyof typeof Plan];
export const PLAN_LABEL: Record<Plan, string> = { FREE: 'Miễn phí', BASIC: 'Cơ bản', PRO: 'Chuyên nghiệp', CHAIN: 'Chuỗi' };

export const SubscriptionStatus = { TRIAL: 'TRIAL', ACTIVE: 'ACTIVE', PAST_DUE: 'PAST_DUE', CANCELLED: 'CANCELLED' } as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = { TRIAL: 'Dùng thử', ACTIVE: 'Đang dùng', PAST_DUE: 'Quá hạn', CANCELLED: 'Đã hủy' };

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'Chủ quán',
  MANAGER: 'Quản lý',
  WAITER: 'Phục vụ',
  KITCHEN: 'Bếp / Bar',
  CASHIER: 'Thu ngân',
};

export const KITCHEN_STATUS_LABEL: Record<KitchenStatus, string> = {
  QUEUED: 'Đã nhận',
  COOKING: 'Đang làm',
  DONE: 'Đã xong',
  SERVED: 'Đã ra món',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_CONFIRM: 'Chờ xác nhận',
  ACCEPTED: 'Đã nhận',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã hủy',
};
