import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { PLAN_LABEL, SUBSCRIPTION_STATUS_LABEL, type Plan, type SubscriptionStatus } from '@lengkeng/shared';
import { api, ApiError } from '../../lib/api';
import { usePlatform, type PlatformStore } from '../../lib/platform';

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('vi-VN') : '—');

/** A1 · Danh sách mọi quán trên hệ thống: tạo hộ, khóa/mở, gán gói. */
export function PlatformStoresPage() {
  const { session, setSession } = usePlatform();
  const qc = useQueryClient();
  const nav = useNavigate();
  const token = session!.token;
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<PlatformStore | null>(null);

  const stores = useQuery({
    queryKey: ['p-stores', q],
    queryFn: () => api<PlatformStore[]>(`/p/stores${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token }),
    retry: (n, e) => !(e instanceof ApiError && e.status === 401) && n < 2,
  });
  if (stores.error instanceof ApiError && stores.error.status === 401) {
    setSession(null);
    nav('/sys/login', { replace: true });
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['p-stores'] });
  const toggle = useMutation({
    mutationFn: (s: PlatformStore) => {
      const reason = s.isActive ? prompt(`Khóa quán "${s.name}"? Lý do (hiện cho chủ quán):`, 'Hết hạn gói') : null;
      if (s.isActive && reason === null) return Promise.resolve(null);
      return api(`/p/stores/${s.id}`, { method: 'PATCH', token, body: { isActive: !s.isActive, suspendedReason: reason || undefined } });
    },
    onSuccess: invalidate,
  });

  const rows = stores.data ?? [];
  const active = rows.filter((s) => s.isActive).length;

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-2 flex items-center gap-3">
        <div className="font-bold">Lengkeng · Quản trị hệ thống</div>
        <div className="ml-auto text-sm text-slate-300">{session!.admin.name}</div>
        <button className="text-sm underline text-slate-300" onClick={() => { setSession(null); nav('/sys/login'); }}>Đăng xuất</button>
      </header>
      <main className="p-4 max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">Cửa hàng <span className="text-slate-500 font-normal text-base">· {rows.length} quán, {active} đang hoạt động</span></h1>
          <input className="input max-w-xs ml-auto" placeholder="Tìm theo tên, slug, email chủ quán" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ Tạo quán hộ khách</button>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-3">Quán</th><th className="p-3">Chủ quán</th><th className="p-3">Gói</th><th className="p-3">Hết hạn</th>
                <th className="p-3 text-right">Bàn</th><th className="p-3 text-right">Đơn 7 ngày</th><th className="p-3">Trạng thái</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {stores.isLoading && <tr><td className="p-3 text-slate-500" colSpan={8}>Đang tải…</td></tr>}
              {!stores.isLoading && rows.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={8}>Chưa có quán nào.</td></tr>}
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.slug} · tạo {fmtDate(s.createdAt)}</div>
                  </td>
                  <td className="p-3">{s.owner ? <><div>{s.owner.name}</div><div className="text-xs text-slate-500">{s.owner.email}</div></> : '—'}</td>
                  <td className="p-3">
                    {s.subscription ? <>{PLAN_LABEL[s.subscription.plan as Plan]} <span className="text-xs text-slate-500">· {SUBSCRIPTION_STATUS_LABEL[s.subscription.status as SubscriptionStatus]}</span></> : '—'}
                  </td>
                  <td className="p-3">{fmtDate(s.subscription?.endsAt)}</td>
                  <td className="p-3 text-right">{s.tables}</td>
                  <td className="p-3 text-right">{s.ordersLast7d}<span className="text-xs text-slate-400"> / {s.orders}</span></td>
                  <td className="p-3">
                    {s.isActive
                      ? <span className="inline-block rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold">Hoạt động</span>
                      : <span className="inline-block rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs font-semibold" title={s.suspendedReason ?? ''}>Đã khóa</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="btn-ghost min-h-9 px-3 text-xs mr-1" onClick={() => setEditing(s)}>Gói</button>
                    <button className={`${s.isActive ? 'btn-danger' : 'btn-success'} min-h-9 px-3 text-xs`} onClick={() => toggle.mutate(s)}>{s.isActive ? 'Khóa' : 'Mở'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {showCreate && <CreateStoreDialog token={token} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); invalidate(); }} />}
      {editing && <PlanDialog token={token} store={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); invalidate(); }} />}
    </div>
  );
}

function CreateStoreDialog({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ storeName: '', address: '', ownerName: '', email: '', password: '', tableCount: 10, plan: 'FREE' as Plan, trialDays: 30 });
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ store: { name: string }; owner: { email: string } } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const m = useMutation({
    mutationFn: () => api<{ store: { name: string }; owner: { email: string } }>('/p/stores', {
      method: 'POST', token,
      body: { ...f, address: f.address || undefined, tableCount: Number(f.tableCount), trialDays: Number(f.trialDays) },
    }),
    onSuccess: (r) => setResult(r),
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Lỗi kết nối'),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); setErr(null); m.mutate(); };

  return (
    <Dialog title="Tạo quán hộ khách" onClose={onClose}>
      {result ? (
        <div className="space-y-3">
          <p>Đã tạo quán <b>{result.store.name}</b>. Gửi cho chủ quán:</p>
          <pre className="bg-slate-100 rounded p-3 text-sm whitespace-pre-wrap">Đăng nhập: {location.origin}/login{'\n'}Email: {result.owner.email}{'\n'}Mật khẩu: {f.password}</pre>
          <button className="btn-primary w-full" onClick={onDone}>Xong</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Tên quán</label><input className="input" value={f.storeName} onChange={set('storeName')} required minLength={2} autoFocus /></div>
          <div><label className="label">Địa chỉ</label><input className="input" value={f.address} onChange={set('address')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tên chủ quán</label><input className="input" value={f.ownerName} onChange={set('ownerName')} required /></div>
            <div><label className="label">Số bàn</label><input className="input" type="number" min={1} max={100} value={f.tableCount} onChange={set('tableCount')} /></div>
          </div>
          <div><label className="label">Email chủ quán</label><input className="input" type="email" value={f.email} onChange={set('email')} required /></div>
          <div><label className="label">Mật khẩu tạm</label><input className="input" value={f.password} onChange={set('password')} required minLength={8} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gói</label>
              <select className="input" value={f.plan} onChange={set('plan')}>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <div><label className="label">Số ngày dùng thử</label><input className="input" type="number" min={0} max={365} value={f.trialDays} onChange={set('trialDays')} /></div>
          </div>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="flex gap-2 justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={m.isPending}>Tạo quán</button></div>
        </form>
      )}
    </Dialog>
  );
}

function PlanDialog({ token, store, onClose, onDone }: { token: string; store: PlatformStore; onClose: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<Plan>((store.subscription?.plan as Plan) ?? 'FREE');
  const [status, setStatus] = useState<SubscriptionStatus>((store.subscription?.status as SubscriptionStatus) ?? 'TRIAL');
  const [endsAt, setEndsAt] = useState(store.subscription?.endsAt ? store.subscription.endsAt.slice(0, 10) : '');
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => api(`/p/stores/${store.id}`, {
      method: 'PATCH', token,
      body: { plan, subscriptionStatus: status, endsAt: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null },
    }),
    onSuccess: onDone,
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Lỗi kết nối'),
  });
  return (
    <Dialog title={`Gói cước · ${store.name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-3">
        <div><label className="label">Gói</label><select className="input" value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Trạng thái</label><select className="input" value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>{Object.entries(SUBSCRIPTION_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label">Hết hạn (để trống = không hết hạn)</label><input className="input" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex gap-2 justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={m.isPending}>Lưu</button></div>
      </form>
    </Dialog>
  );
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card w-full max-w-md p-5 space-y-3 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
