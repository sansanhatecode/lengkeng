import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { StaffInfo, StoreInfo } from '../lib/types';

export function LoginPage() {
  const { setDevice, setSession } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shared, setShared] = useState(true);
  const [deviceName, setDeviceName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ staffToken: string; deviceToken?: string; staff: StaffInfo; store: StoreInfo }>('/auth/login', {
        method: 'POST',
        body: { email, password, deviceName: shared ? deviceName || 'Thiết bị quán' : undefined },
      });
      if (r.deviceToken) setDevice(r.deviceToken);
      setSession({ token: r.staffToken, staff: r.staff, store: r.store });
      nav('/', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-bold">Đăng nhập quản lý</h1>
        <div><label className="label" htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
        <div><label className="label" htmlFor="password">Mật khẩu</label><input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} className="mt-1" />
          <span>Đây là thiết bị dùng chung của quán (tablet bếp, máy thu ngân). Sau khi đăng nhập, nhân viên đổi ca bằng mã PIN.</span>
        </label>
        {shared && <div><label className="label" htmlFor="deviceName">Tên thiết bị</label><input id="deviceName" className="input" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Ví dụ: Tablet bếp 1" /></div>}
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
        <p className="text-sm text-center text-slate-600">Quán mới? <Link to="/register" className="text-blue-700 underline">Tạo quán miễn phí</Link></p>
      </form>
    </main>
  );
}
