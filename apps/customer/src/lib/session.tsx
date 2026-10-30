import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ScanResult } from './types';

const KEY = 'lk.customer';

type Ctx = {
  data: ScanResult | null;
  token: string | null;
  save: (r: ScanResult) => void;
  clear: () => void;
  /** Tên hiển thị của người đang cầm máy, để biết ai thêm món vào giỏ chung */
  nick: string;
};

const SessionCtx = createContext<Ctx>(null!);

const load = (): ScanResult | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScanResult) : null;
  } catch {
    return null;
  }
};

const nickOf = () => {
  try {
    let n = sessionStorage.getItem('lk.nick');
    if (!n) {
      n = `Khách ${Math.floor(Math.random() * 90 + 10)}`;
      sessionStorage.setItem('lk.nick', n);
    }
    return n;
  } catch {
    return 'Khách';
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ScanResult | null>(load);
  const save = useCallback((r: ScanResult) => {
    setData(r);
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {}
  }, []);
  const clear = useCallback(() => {
    setData(null);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);
  const value = useMemo(() => ({ data, token: data?.token ?? null, save, clear, nick: nickOf() }), [data, save, clear]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
