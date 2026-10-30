import { useState, type FormEvent } from 'react';
import { STAFF_ROLE_LABEL, type StaffRole } from '@lengkeng/shared';
import { useAction, useStaffList } from '../../lib/queries';
import type { StaffRow } from '../../lib/types';

/** Q3: nhân viên, vai trò, PIN. */
export function StaffAdminPage() {
  const list = useStaffList();
  const [editing, setEditing] = useState<StaffRow | 'new' | null>(null);
  const toggle = useAction<StaffRow>((f, s) => f(`/s/staff/${s.id}`, { method: 'PATCH', body: { isActive: !s.isActive } }), ['staff']);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nhân viên</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>＋ Thêm nhân viên</button>
      </div>
      <p className="text-sm text-slate-500">Quản lý đăng nhập bằng email + mật khẩu. Nhân viên đổi ca trên thiết bị của quán bằng mã PIN, PIN không trùng nhau trong quán.</p>
      <div className="card divide-y">
        {list.data?.map((s) => (
          <div key={s.id} className={`p-3 flex items-center gap-3 ${s.isActive ? '' : 'opacity-50'}`}>
            <div className="flex-1">
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-slate-500">{STAFF_ROLE_LABEL[s.role]}{s.email ? ` · ${s.email}` : ''}{s.hasPin ? ' · có PIN' : ''}</div>
            </div>
            <button className="btn-ghost min-h-9 text-sm" onClick={() => setEditing(s)}>Sửa</button>
            {s.role !== 'OWNER' && <button className="btn-ghost min-h-9 text-sm" onClick={() => toggle.mutate(s)}>{s.isActive ? 'Khóa' : 'Mở'}</button>}
          </div>
        ))}
      </div>
      {editing && <StaffForm staff={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StaffForm({ staff, onClose }: { staff: StaffRow | null; onClose: () => void }) {
  const [name, setName] = useState(staff?.name ?? '');
  const [role, setRole] = useState<StaffRole>(staff?.role ?? 'WAITER');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const save = useAction((f) =>
    f(staff ? `/s/staff/${staff.id}` : '/s/staff', {
      method: staff ? 'PATCH' : 'POST',
      body: { name, role, email: email || null, password: password || undefined, pin: pin || undefined },
    }),
    ['staff'],
  );
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined, { onSuccess: onClose, onError: (er) => setErr((er as Error).message) }); };
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="card p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-lg">{staff ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2>
        <div><label className="label">Tên</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div>
          <label className="label">Vai trò</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} disabled={staff?.role === 'OWNER'}>
            {(Object.keys(STAFF_ROLE_LABEL) as StaffRole[]).filter((r) => r !== 'OWNER' || staff?.role === 'OWNER').map((r) => <option key={r} value={r}>{STAFF_ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div><label className="label">Mã PIN (4–6 số, để đổi ca trên thiết bị quán)</label><input className="input" inputMode="numeric" pattern="\d{4,6}" value={pin} onChange={(e) => setPin(e.target.value)} placeholder={staff?.hasPin ? 'Để trống nếu giữ PIN cũ' : ''} /></div>
        <div><label className="label">Email (chỉ cần cho quản lý đăng nhập web)</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {email && <div><label className="label">Mật khẩu</label><input className="input" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={staff?.email ? 'Để trống nếu giữ mật khẩu cũ' : ''} /></div>}
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex gap-2 justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={save.isPending}>Lưu</button></div>
      </form>
    </div>
  );
}
