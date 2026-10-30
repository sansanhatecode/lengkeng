import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError } from '../../lib/api';
import { usePlatform, type PlatformAdmin } from '../../lib/platform';

export function PlatformLoginPage() {
  const { setSession } = usePlatform();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ token: string; admin: PlatformAdmin }>('/p/login', { method: 'POST', body: { email, password } });
      setSession(r);
      nav('/sys', { replace: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-slate-900">
      <form onSubmit={submit} className="card w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-bold">Quản trị hệ thống</h1>
        <p className="text-sm text-slate-600">Dành cho đội vận hành Lengkeng, không phải chủ quán.</p>
        <div><label className="label" htmlFor="sys-email">Email</label><input id="sys-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></div>
        <div><label className="label" htmlFor="sys-password">Mật khẩu</label><input id="sys-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </main>
  );
}
