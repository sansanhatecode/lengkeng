import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeEvent, type Cart } from '@lengkeng/shared';
import { SOCKET_URL } from './api';
import type { Order, SessionState } from './types';

/** Kết nối realtime cho khách: cập nhật giỏ chung, trạng thái đơn, đóng bàn. */
export function useCustomerRealtime(token: string | null, onClosed: () => void) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!token) return;
    const socket: Socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });

    socket.on(RealtimeEvent.CART_UPDATED, (cart: Cart) => {
      qc.setQueryData<SessionState>(['session'], (s) => (s ? { ...s, cart } : s));
    });
    const refresh = () => void qc.invalidateQueries({ queryKey: ['session'] });
    socket.on(RealtimeEvent.ORDER_CREATED, (o: Order) => {
      qc.setQueryData<SessionState>(['session'], (s) =>
        s && !s.orders.some((x) => x.id === o.id) ? { ...s, orders: [...s.orders, o] } : s,
      );
      refresh();
    });
    socket.on(RealtimeEvent.ORDER_UPDATED, refresh);
    socket.on(RealtimeEvent.ORDER_ITEM_UPDATED, (it: { id: string; orderId: string; kitchenStatus: Order['items'][number]['kitchenStatus'] }) => {
      qc.setQueryData<SessionState>(['session'], (s) =>
        s
          ? {
              ...s,
              orders: s.orders.map((o) =>
                o.id === it.orderId ? { ...o, items: o.items.map((i) => (i.id === it.id ? { ...i, kitchenStatus: it.kitchenStatus } : i)) } : o,
              ),
            }
          : s,
      );
    });
    socket.on(RealtimeEvent.SERVICE_REQUEST_HANDLED, refresh);
    socket.on(RealtimeEvent.MENU_ITEM_AVAILABILITY, () => void qc.invalidateQueries({ queryKey: ['menu'] }));
    socket.on(RealtimeEvent.SESSION_CLOSED, onClosed);
    socket.on('connect', refresh); // kết nối lại thì tải lại cho chắc

    return () => {
      socket.disconnect();
    };
  }, [token, qc, onClosed]);
}
