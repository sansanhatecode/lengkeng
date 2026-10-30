import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { StaffInfo } from '../lib/types';

/** Đổi ca trên thiết bị dùng chung: nhập PIN 4–6 số. */
export function PinPage() {
  const { deviceToken, session, setSession, forgetDevice } = useAuth();
  const nav = useNavigate();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ staffToken: string; staff: StaffInfo }>('/auth/pin', { method: 'POST', body: { pin: value }, token: deviceToken ?? session?.token });
      const store = session?.store ?? (await api<{ store: { id: string; name: string; slug: string } }>('/auth/me', { token: r.staffToken })).store;
      setSession({ token: r.staffToken, staff: r.staff, store });
      nav('/', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Không kết nối được');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (pin.length === 6) void submit(pin);
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (d: string) => setPin((p) => (p.length < 6 ? p + d : p));

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="card w-full max-w-xs p-6 text-center space-y-4">
        <h1 className="text-xl font-bold">Nhập mã PIN</h1>
        <p className="text-sm text-slate-500">{session?.store.name ?? 'Thiết bị của quán'}</p>
        <div className="flex justify-center gap-2 h-6">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-blue-700' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => (
            <button
              key={k}
              onClick={() => (k === 'C' ? setPin('') : k === 'OK' ? pin.length >= 4 && submit(pin) : press(k))}
              className={`min-h-14 rounded-xl text-xl font-semibold ${k === 'OK' ? 'bg-blue-700 text-white' : 'bg-slate-100 active:bg-slate-200'}`}
            >
              {k}
            </button>
          ))}
        </div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="text-xs text-slate-400 underline" onClick={() => { forgetDevice(); nav('/login'); }}>Đăng nhập bằng tài khoản khác</button>
      </div>
    </main>
  );
}
