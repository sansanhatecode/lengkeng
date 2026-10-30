import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const KEY = 'lk.platform';
export type PlatformAdmin = { id: string; name: string; email: string };
type PlatformSession = { token: string; admin: PlatformAdmin };
type Ctx = { session: PlatformSession | null; setSession: (s: PlatformSession | null) => void };
const PlatformCtx = createContext<Ctx>(null!);

/** Phiên quản trị hệ thống, tách khỏi phiên nhân viên quán để một máy có thể dùng cả hai. */
export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSess] = useState<PlatformSession | null>(() => {
    try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as PlatformSession) : null; } catch { return null; }
  });
  const setSession = useCallback((s: PlatformSession | null) => {
    setSess(s);
    try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch {}
  }, []);
  const value = useMemo(() => ({ session, setSession }), [session, setSession]);
  return <PlatformCtx.Provider value={value}>{children}</PlatformCtx.Provider>;
}
export const usePlatform = () => useContext(PlatformCtx);

export type PlatformStore = {
  id: string; name: string; slug: string; address?: string | null; isActive: boolean; suspendedReason?: string | null; createdAt: string;
  owner: { name: string; email?: string | null } | null;
  subscription: { plan: string; status: string; endsAt?: string | null } | null;
  tables: number; staff: number; orders: number; ordersLast7d: number;
};
