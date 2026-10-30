import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuth } from './auth';
import type { AreaRow, Bill, Category, FloorArea, KitchenItem, Order, QrRow, ServiceRequest, StaffRow, StoreDetail } from './types';

export const useApi = () => {
  const { token } = useAuth();
  return <T,>(path: string, opts: { method?: string; body?: unknown } = {}) => api<T>(path, { ...opts, token });
};

export const useFloor = () => { const f = useApi(); return useQuery({ queryKey: ['floor'], queryFn: () => f<FloorArea[]>('/s/floor'), refetchInterval: 20_000 }); };
export const useOrders = (status?: string) => { const f = useApi(); return useQuery({ queryKey: ['orders', status ?? 'today'], queryFn: () => f<Order[]>(`/s/orders${status ? `?status=${status}` : ''}`), refetchInterval: 20_000 }); };
export const useKitchen = (station?: string) => { const f = useApi(); return useQuery({ queryKey: ['kitchen', station ?? 'ALL'], queryFn: () => f<KitchenItem[]>(`/s/kitchen/queue${station ? `?station=${station}` : ''}`), refetchInterval: 15_000 }); };
export const useRequests = () => { const f = useApi(); return useQuery({ queryKey: ['requests'], queryFn: () => f<ServiceRequest[]>('/s/service-requests'), refetchInterval: 20_000 }); };
export const useBill = (sessionId: string | null, discount = 0, surcharge = 0) => {
  const f = useApi();
  return useQuery({ queryKey: ['bill', sessionId, discount, surcharge], queryFn: () => f<Bill>(`/s/sessions/${sessionId}/bill?discount=${discount}&surcharge=${surcharge}`), enabled: !!sessionId });
};
export const useFullMenu = () => { const f = useApi(); return useQuery({ queryKey: ['menu'], queryFn: () => f<Category[]>('/s/menu') }); };
export const useStaffList = () => { const f = useApi(); return useQuery({ queryKey: ['staff'], queryFn: () => f<StaffRow[]>('/s/staff') }); };
export const useStore = () => { const f = useApi(); return useQuery({ queryKey: ['store'], queryFn: () => f<StoreDetail>('/s/store') }); };
export const useAreas = () => { const f = useApi(); return useQuery({ queryKey: ['areas'], queryFn: () => f<AreaRow[]>('/s/areas') }); };
export const useQrImages = (enabled: boolean) => { const f = useApi(); return useQuery({ queryKey: ['qr'], queryFn: () => f<QrRow[]>('/s/tables/qr'), enabled }); };

/** Mutation gọi API rồi làm mới các query liên quan. */
export const useAction = <TVars = void,>(fn: (f: ReturnType<typeof useApi>, vars: TVars) => Promise<unknown>, invalidate: string[]) => {
  const f = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(f, vars),
    onSuccess: () => invalidate.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })),
  });
};
