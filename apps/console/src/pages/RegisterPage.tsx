import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { StaffInfo, StoreInfo } from '../lib/types';

/** Chủ quán tự tạo quán mới: xong là vào thẳng trang quản trị, có sẵn bàn để in QR. */
export function RegisterPage() {
  const { setSession } = useAuth();
  const [f, setF] = useState({ storeName: '', address: '', ownerName: '', email: '', password: '', pin: '', tableCount: 10 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ staffToken: string; staff: StaffInfo; store: StoreInfo }>('/auth/register', {
        method: 'POST',
        body: {
          storeName: f.storeName,
          address: f.address || undefined,
          ownerName: f.ownerName,
          email: f.email,
          password: f.password,
          pin: f.pin || undefined,
          tableCount: Number(f.tableCount) || 10,
        },
      });
      // Không điều hướng tay: App thấy có phiên sẽ chuyển /register → trang Bàn & QR (việc đầu tiên của quán mới là in QR)
      setSession({ token: r.staffToken, staff: r.staff, store: r.store });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Không kết nối được máy chủ');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Tạo quán mới</h1>
          <p className="text-sm text-slate-600">Dùng thử miễn phí 30 ngày. Tạo xong có ngay mã QR cho từng bàn.</p>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-700 mb-1">Quán</legend>
          <div><label className="label" htmlFor="storeName">Tên quán</label><input id="storeName" className="input" value={f.storeName} onChange={set('storeName')} required minLength={2} autoFocus placeholder="Ví dụ: Quán Lẩu Dê Ba Cây" /></div>
          <div><label className="label" htmlFor="address">Địa chỉ (tùy chọn)</label><input id="address" className="input" value={f.address} onChange={set('address')} /></div>
          <div>
            <label className="label" htmlFor="tableCount">Số bàn ban đầu</label>
            <input id="tableCount" className="input" type="number" min={1} max={100} value={f.tableCount} onChange={set('tableCount')} />
            <p className="text-xs text-slate-500 mt-1">Đặt tên B1, B2… trong khu "Khu chính". Đổi tên, thêm khu và bàn sau ở mục Bàn &amp; QR.</p>
          </div>
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-700 mb-1">Tài khoản chủ quán</legend>
          <div><label className="label" htmlFor="ownerName">Tên của bạn</label><input id="ownerName" className="input" value={f.ownerName} onChange={set('ownerName')} required /></div>
          <div><label className="label" htmlFor="email">Email đăng nhập</label><input id="email" className="input" type="email" value={f.email} onChange={set('email')} required /></div>
          <div><label className="label" htmlFor="password">Mật khẩu (ít nhất 8 ký tự)</label><input id="password" className="input" type="password" value={f.password} onChange={set('password')} required minLength={8} /></div>
          <div><label className="label" htmlFor="pin">Mã PIN đổi ca (4–6 số, tùy chọn)</label><input id="pin" className="input" inputMode="numeric" pattern="\d{4,6}" value={f.pin} onChange={set('pin')} placeholder="Dùng khi đổi ca trên tablet chung" /></div>
        </fieldset>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Đang tạo quán…' : 'Tạo quán'}</button>
        <p className="text-sm text-center text-slate-600">Đã có tài khoản? <Link to="/login" className="text-blue-700 underline">Đăng nhập</Link></p>
      </form>
    </main>
  );
}
