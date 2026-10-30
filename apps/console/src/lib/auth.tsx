import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StaffInfo, StoreInfo } from './types';

const DEVICE_KEY = 'lk.device';
const STAFF_KEY = 'lk.staff';

type StaffSession = { token: string; staff: StaffInfo; store: StoreInfo };
type Ctx = {
  deviceToken: string | null;
  session: StaffSession | null;
  token: string | null;
  setDevice: (t: string | null) => void;
  setSession: (s: StaffSession | null) => void;
  logoutStaff: () => void;
  forgetDevice: () => void;
};
const AuthCtx = createContext<Ctx>(null!);

const read = <T,>(k: string): T | null => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
};
const write = (k: string, v: unknown) => {
  try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [deviceToken, setDev] = useState<string | null>(() => read<string>(DEVICE_KEY));
  const [session, setSess] = useState<StaffSession | null>(() => read<StaffSession>(STAFF_KEY));
  const setDevice = useCallback((t: string | null) => { setDev(t); write(DEVICE_KEY, t); }, []);
  const setSession = useCallback((s: StaffSession | null) => { setSess(s); write(STAFF_KEY, s); }, []);
  const logoutStaff = useCallback(() => setSession(null), [setSession]);
  const forgetDevice = useCallback(() => { setSession(null); setDevice(null); }, [setSession, setDevice]);
  const value = useMemo(
    () => ({ deviceToken, session, token: session?.token ?? null, setDevice, setSession, logoutStaff, forgetDevice }),
    [deviceToken, session, setDevice, setSession, logoutStaff, forgetDevice],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
