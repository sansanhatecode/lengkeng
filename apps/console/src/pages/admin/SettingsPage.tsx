import { useEffect, useState } from 'react';
import type { StoreSettings } from '@lengkeng/shared';
import { useAction, useStore } from '../../lib/queries';

export function SettingsPage() {
  const store = useStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [s, setS] = useState<StoreSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (store.data) { setName(store.data.name); setAddress(store.data.address ?? ''); setS(store.data.settings); }
  }, [store.data]);
  const save = useAction((f) => f('/s/store', { method: 'PATCH', body: { name, address: address || null, settings: s } }), ['store']);
  if (!s) return <p className="text-slate-500">Đang tải…</p>;

  const Toggle = ({ k, label, hint }: { k: keyof StoreSettings; label: string; hint: string }) => (
    <label className="flex items-start gap-3 py-3 border-b last:border-0">
      <input type="checkbox" className="mt-1 w-5 h-5" checked={Boolean(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
      <span><span className="font-medium">{label}</span><span className="block text-sm text-slate-500">{hint}</span></span>
    </label>
  );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Cài đặt cửa hàng</h1>
      <div className="card p-4 space-y-3">
        <div><label className="label">Tên quán</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="label">Địa chỉ</label><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        {store.data?.subscription && <p className="text-sm text-slate-500">Gói: {store.data.subscription.plan} · {store.data.subscription.status}{store.data.subscription.endsAt ? ` · đến ${new Date(store.data.subscription.endsAt).toLocaleDateString('vi-VN')}` : ''}</p>}
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-1">Nhận đơn</h2>
        <Toggle k="requireFirstOrderConfirm" label="Đơn đầu tiên của mỗi phiên cần phục vụ xác nhận" hint="Chặn người chụp ảnh QR gọi món từ xa. Khuyên bật." />
        <Toggle k="requireOrderConfirm" label="Mọi đơn đều cần phục vụ xác nhận" hint="An toàn hơn nhưng chậm hơn, phục vụ phải canh điện thoại." />
        <div className="py-3 border-b">
          <div className="font-medium">Ai mở bàn</div>
          <div className="flex gap-2 mt-2">
            {(['ON_SCAN', 'BY_STAFF'] as const).map((m) => (
              <button key={m} onClick={() => setS({ ...s, sessionOpenMode: m })} className={`min-h-10 px-3 rounded-lg border text-sm ${s.sessionOpenMode === m ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300'}`}>
                {m === 'ON_SCAN' ? 'Khách quét là mở bàn' : 'Phục vụ mở bàn'}
              </button>
            ))}
          </div>
        </div>
        <div className="py-3 grid grid-cols-2 gap-3">
          <div><label className="label">VAT (%)</label><input type="number" min={0} max={100} className="input" value={s.vatPercent} onChange={(e) => setS({ ...s, vatPercent: Number(e.target.value) || 0 })} /></div>
          <div><label className="label">Tự đóng phiên treo sau (giờ)</label><input type="number" min={1} max={24} className="input" value={s.autoCloseSessionHours} onChange={(e) => setS({ ...s, autoCloseSessionHours: Number(e.target.value) || 4 })} /></div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } })}>Lưu cài đặt</button>
        {saved && <span className="text-green-700 text-sm">Đã lưu</span>}
        {save.isError && <span className="text-red-700 text-sm">{(save.error as Error).message}</span>}
      </div>
    </div>
  );
}
