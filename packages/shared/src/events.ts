/** Tên sự kiện realtime (Socket.IO). Server phát, client lắng nghe. */
export const RealtimeEvent = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_ITEM_UPDATED: 'orderItem.updated',
  SERVICE_REQUEST_CREATED: 'serviceRequest.created',
  SERVICE_REQUEST_HANDLED: 'serviceRequest.handled',
  SESSION_OPENED: 'session.opened',
  SESSION_CLOSED: 'session.closed',
  CART_UPDATED: 'cart.updated',
  MENU_ITEM_AVAILABILITY: 'menuItem.availability',
  BILL_UPDATED: 'bill.updated',
} as const;
export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

/** Phòng (room) Socket.IO */
export const rooms = {
  store: (storeId: string) => `store:${storeId}`,
  station: (storeId: string, station: string) => `store:${storeId}:station:${station}`,
  session: (sessionId: string) => `session:${sessionId}`,
};
