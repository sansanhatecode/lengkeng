import type { Cart, KitchenStatus, OrderStatus, Station } from '@lengkeng/shared';

export type Modifier = { id: string; name: string; priceDelta: number };
export type ModifierGroup = { id: string; name: string; required: boolean; minSelect: number; maxSelect: number; modifiers: Modifier[] };
export type MenuItem = {
  id: string; nameVi: string; nameEn?: string | null; descVi?: string | null; price: number;
  imageUrl?: string | null; tags: string[]; station: Station; modifierGroups: ModifierGroup[];
};
export type MenuCategory = { id: string; nameVi: string; nameEn?: string | null; items: MenuItem[] };

export type OrderItem = {
  id: string; nameSnapshot: string; qty: number; unitPrice: number; note?: string | null;
  modifiersSnapshot: { name: string; priceDelta: number }[]; kitchenStatus: KitchenStatus;
};
export type Order = { id: string; dailyNumber: number; status: OrderStatus; rejectReason?: string | null; createdAt: string; items: OrderItem[] };

export type SessionState = {
  id: string; status: 'OPEN' | 'CLOSED'; cart: Cart; orders: Order[];
  openRequests: { id: string; type: string }[]; subtotal: number;
};

export type ScanResult = {
  token: string;
  store: { id: string; name: string; languages: string[]; vatPercent: number };
  table: { id: string; name: string; area: string };
  session: { id: string; openedAt: string };
};
