import { useState } from 'react';
import { useAction, useAreas, useQrImages } from '../../lib/queries';

/** Q2: khu vực, bàn, sinh QR, in tem. */
export function TablesAdminPage() {
  const areas = useAreas();
  const [printing, setPrinting] = useState(false);
  const qr = useQrImages(printing);
  const [newArea, setNewArea] = useState('');
  const [newTable, setNewTable] = useState<Record<string, string>>({});

  const createArea = useAction<string>((f, name) => f('/s/areas', { method: 'POST', body: { name, sortOrder: areas.data?.length ?? 0 } }), ['areas', 'floor']);
  const deleteArea = useAction<string>((f, id) => f(`/s/areas/${id}`, { method: 'DELETE' }), ['areas', 'floor']);
  const createTable = useAction<{ areaId: string; name: string }>((f, v) => f('/s/tables', { method: 'POST', body: v }), ['areas', 'floor', 'qr']);
  const deleteTable = useAction<string>((f, id) => f(`/s/tables/${id}`, { method: 'DELETE' }), ['areas', 'floor', 'qr']);
  const rotate = useAction<string>((f, id) => f(`/s/tables/${id}/rotate-qr`, { method: 'POST' }), ['areas', 'qr']);
  const lock = useAction<{ id: string; locked: boolean }>((f, v) => f(`/s/tables/${v.id}/lock`, { method: 'POST', body: { locked: v.locked } }), ['areas', 'floor']);

  if (printing) {
    return (
      <div>
        <div className="no-print flex gap-2 mb-4">
          <button className="btn-primary" onClick={() => window.print()}>In tem QR</button>
          <button className="btn-ghost" onClick={() => setPrinting(false)}>Quay lại</button>
          <span className="text-sm text-slate-500 self-center">Mỗi tem 7×9 cm. Chọn khổ A4, bỏ lề và tiêu đề trang khi in.</span>
        </div>
        <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
          {qr.data?.map((t) => (
            <div key={t.id} className="border border-dashed rounded-xl p-3 text-center break-inside-avoid">
              <div className="text-xs text-slate-500">{t.area}</div>
              <div className="text-3xl font-bold">Bàn {t.name}</div>
              <img src={t.png} alt="" className="w-full aspect-square" />
              <div className="font-semibold">Quét để xem menu & gọi món</div>
              <div className="text-[10px] text-slate-400 break-all">{t.url}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Bàn & mã QR</h1>
        <button className="btn-primary" onClick={() => setPrinting(true)}>In tem QR</button>
      </div>
      <div className="card p-3 flex gap-2">
        <input className="input" placeholder="Tên khu vực mới (Tầng 1, Sân vườn…)" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
        <button className="btn-ghost" disabled={!newArea.trim()} onClick={() => createArea.mutate(newArea.trim(), { onSuccess: () => setNewArea('') })}>Thêm khu</button>
      </div>
      {areas.data?.map((a) => (
        <section key={a.id} className="card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg flex-1">{a.name}</h2>
            <button className="text-sm text-slate-400 underline" onClick={() => confirm(`Xóa khu "${a.name}"?`) && deleteArea.mutate(a.id, { onError: (e) => alert((e as Error).message) })}>Xóa khu</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.tables.map((t) => (
              <div key={t.id} className={`border rounded-lg p-2 min-w-32 ${t.status === 'LOCKED' ? 'bg-slate-100' : ''}`}>
                <div className="font-bold">{t.name} <span className="text-xs font-normal text-slate-500">{t.status === 'LOCKED' ? 'khóa' : t.status === 'OCCUPIED' ? 'có khách' : ''}</span></div>
                <div className="flex gap-1 mt-1 text-xs">
                  <button className="underline text-slate-500" onClick={() => confirm('Đổi mã QR? Tem cũ sẽ không dùng được.') && rotate.mutate(t.id)}>Đổi QR</button>
                  <button className="underline text-slate-500" onClick={() => lock.mutate({ id: t.id, locked: t.status !== 'LOCKED' }, { onError: (e) => alert((e as Error).message) })}>{t.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}</button>
                  <button className="underline text-red-600" onClick={() => confirm(`Xóa bàn ${t.name}?`) && deleteTable.mutate(t.id, { onError: (e) => alert((e as Error).message) })}>Xóa</button>
                </div>
              </div>
            ))}
            <div className="flex gap-1">
              <input className="input min-w-24 max-w-28" placeholder="Tên bàn" value={newTable[a.id] ?? ''} onChange={(e) => setNewTable({ ...newTable, [a.id]: e.target.value })} />
              <button className="btn-ghost" disabled={!newTable[a.id]?.trim()} onClick={() => createTable.mutate({ areaId: a.id, name: newTable[a.id]!.trim() }, { onSuccess: () => setNewTable({ ...newTable, [a.id]: '' }), onError: (e) => alert((e as Error).message) })}>＋</button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
