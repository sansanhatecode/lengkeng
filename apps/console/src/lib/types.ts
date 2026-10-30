import type { KitchenStatus, OrderStatus, StaffRole, Station, StoreSettings, TableStatus } from '@lengkeng/shared';

export type StaffInfo = { id: string; name: string; role: StaffRole };
export type StoreInfo = { id: string; name: string; slug: string };

export type OrderItem = {
  id: string; orderId: string; nameSnapshot: string; qty: number; unitPrice: number; note?: string | null;
  modifiersSnapshot: { name: string; priceDelta: number }[]; station: Station; kitchenStatus: KitchenStatus; createdAt: string;
};
export type Order = {
  id: string; dailyNumber: number; source: 'CUSTOMER' | 'STAFF'; status: OrderStatus; note?: string | null; rejectReason?: string | null;
  createdAt: string; items: OrderItem[];
  session: { id: string; tableId: string; table: { id: string; name: string; area: { name: string } } };
};
export type KitchenItem = OrderItem & {
  order: { id: string; dailyNumber: number; note?: string | null; createdAt: string; approvedAt?: string | null; session: { id: string; table: { name: string; area: { name: string } } } };
};
export type ServiceRequest = { id: string; type: 'CALL_WAITER' | 'REQUEST_BILL'; createdAt: string; session: { id: string; table: { name: string; area: { name: string } } } };

export type FloorTable = {
  id: string; name: string; status: TableStatus; qrToken: string;
  session: null | {
    id: string; openedAt: string; guestCount?: number | null; pendingOrders: number; acceptedOrders: number; itemsNotServed: number; subtotal: number;
    openRequests: { id: string; type: 'CALL_WAITER' | 'REQUEST_BILL'; createdAt: string }[];
  };
};
export type FloorArea = { id: string; name: string; tables: FloorTable[] };

export type Bill = {
  sessionId: string; status: 'OPEN' | 'PAID' | 'VOID'; table: { id: string; name: string; area: string }; openedAt: string; guestCount?: number | null;
  lines: { orderId: string; dailyNumber: number; itemId: string; name: string; modifiers: { name: string }[]; qty: number; unitPrice: number; lineTotal: number; kitchenStatus: KitchenStatus; note?: string | null }[];
  subtotal: number; discount: number; surcharge: number; vatPercent: number; vat: number; total: number;
  payments: { id: string; method: string; amount: number }[]; paidAt?: string | null;
};

export type Modifier = { id: string; name: string; priceDelta: number; isAvailable: boolean };
export type ModifierGroup = { id: string; name: string; required: boolean; minSelect: number; maxSelect: number; modifiers: Modifier[] };
export type MenuItem = {
  id: string; categoryId: string; nameVi: string; nameEn?: string | null; descVi?: string | null; descEn?: string | null; price: number;
  imageUrl?: string | null; station: Station; tags: string[]; isAvailable: boolean; sortOrder: number; modifierGroups: ModifierGroup[];
};
export type Category = { id: string; nameVi: string; nameEn?: string | null; sortOrder: number; availableFrom?: string | null; availableTo?: string | null; items: MenuItem[] };

export type StaffRow = { id: string; name: string; role: StaffRole; email?: string | null; isActive: boolean; hasPin: boolean };
export type StoreDetail = { id: string; name: string; slug: string; address?: string | null; settings: StoreSettings; subscription?: { plan: string; status: string; endsAt?: string | null } | null };
export type AreaRow = { id: string; name: string; sortOrder: number; tables: { id: string; name: string; status: TableStatus; qrToken: string }[] };
export type QrRow = { id: string; name: string; area: string; url: string; png: string };
