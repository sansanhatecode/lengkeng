import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Cart, CartLine } from '@lengkeng/shared';
import { api } from './api';
import { useSession } from './session';
import type { MenuCategory, MenuItem, SessionState } from './types';

export const useMenu = () => {
  const { token } = useSession();
  return useQuery({ queryKey: ['menu'], queryFn: () => api<MenuCategory[]>('/c/menu', { token }), enabled: !!token });
};

export const useSessionState = () => {
  const { token } = useSession();
  return useQuery({ queryKey: ['session'], queryFn: () => api<SessionState>('/c/session', { token }), enabled: !!token, refetchInterval: 30_000 });
};

/** Giỏ chung của bàn: mọi thay đổi ghi lên server, các máy khác nhận qua realtime. */
export const useCart = () => {
  const { token, nick } = useSession();
  const qc = useQueryClient();
  const state = useSessionState();
  const lines = state.data?.cart.lines ?? [];

  const save = useMutation({
    mutationFn: (cart: Cart) => api<Cart>('/c/cart', { method: 'PUT', body: cart, token }),
    onMutate: async (cart) => {
      await qc.cancelQueries({ queryKey: ['session'] });
      qc.setQueryData<SessionState>(['session'], (s) => (s ? { ...s, cart } : s));
    },
    onError: () => void qc.invalidateQueries({ queryKey: ['session'] }),
  });

  const add = (line: Omit<CartLine, 'lineId' | 'addedBy'>) =>
    save.mutate({ lines: [...lines, { ...line, lineId: crypto.randomUUID(), addedBy: nick }] });
  const setQty = (lineId: string, qty: number) =>
    save.mutate({ lines: qty <= 0 ? lines.filter((l) => l.lineId !== lineId) : lines.map((l) => (l.lineId === lineId ? { ...l, qty } : l)) });
  const clear = () => save.mutate({ lines: [] });

  return { lines, add, setQty, clear, saving: save.isPending };
};

export const priceOf = (item: MenuItem, modifierIds: string[]) =>
  item.price +
  item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => modifierIds.includes(m.id)).reduce((s, m) => s + m.priceDelta, 0);
