import { useMemo, useState } from 'react';
import { formatVnd } from '@lengkeng/shared';
import { useAction, useFullMenu } from '../lib/queries';
import type { MenuItem } from '../lib/types';

type Line = { key: string; item: MenuItem; qty: number; modifiers: { groupId: string; modifierId: string }[]; note?: string };

/** V3: phục vụ gọi món hộ khách. */
export function MenuPicker({ sessionId, tableName, onClose }: { sessionId: string; tableName: string; onClose: () => void }) {
  const menu = useFullMenu();
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const send = useAction((f) =>
    f(`/s/sessions/${sessionId}/orders`, {
      method: 'POST',
      body: { idempotencyKey: crypto.randomUUID(), lines: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, modifiers: l.modifiers, note: l.note })) },
    }),
    ['orders', 'floor', 'kitchen'],
  );

  const items = useMemo(
    () => (menu.data ?? []).flatMap((c) => c.items).filter((i) => i.isAvailable && i.nameVi.toLowerCase().includes(filter.toLowerCase())),
    [menu.data, filter],
  );
  const priceOf = (l: Line) => l.item.price + l.item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => l.modifiers.some((x) => x.modifierId === m.id)).reduce((s, m) => s + m.priceDelta, 0);
  const total = lines.reduce((s, l) => s + priceOf(l) * l.qty, 0);

  const addItem = (item: MenuItem) => {
    if (item.modifierGroups.length === 0) setLines((ls) => [...ls, { key: crypto.randomUUID(), item, qty: 1, modifiers: [] }]);
    else setPicking(item);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b flex items-center gap-2">
          <h2 className="font-bold text-lg">Gọi món hộ · Bàn {tableName}</h2>
          <input className="input ml-auto max-w-xs" placeholder="Tìm món…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button className="btn-ghost min-h-10" onClick={onClose}>Đóng</button>
        </div>
        <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-2">
          <div className="overflow-y-auto p-3 grid gap-2 grid-cols-2 content-start border-r">
            {items.map((i) => (
              <button key={i.id} onClick={() => addItem(i)} className="card p-2 text-left min-h-16 hover:bg-blue-50">
                <div className="font-semibold leading-tight">{i.nameVi}</div>
                <div className="text-sm text-blue-700">{formatVnd(i.price)}</div>
              </button>
            ))}
          </div>
          <div className="overflow-y-auto p-3 space-y-2">
            {lines.length === 0 && <p className="text-slate-500 text-sm">Chạm vào món để thêm.</p>}
            {lines.map((l) => (
              <div key={l.key} className="card p-2 flex gap-2 items-start">
                <div className="flex-1">
                  <div className="font-semibold">{l.item.nameVi}</div>
                  <div className="text-xs text-slate-500">
                    {l.item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => l.modifiers.some((x) => x.modifierId === m.id)).map((m) => m.name).join(', ')}
                  </div>
                  <input className="input min-h-9 mt-1 text-sm" placeholder="Ghi chú" value={l.note ?? ''} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, note: e.target.value } : x)))} />
                </div>
                <div className="flex items-center border rounded-lg">
                  <button className="min-w-9 min-h-9" onClick={() => setLines((ls) => (l.qty <= 1 ? ls.filter((x) => x.key !== l.key) : ls.map((x) => (x.key === l.key ? { ...x, qty: x.qty - 1 } : x))))}>−</button>
                  <span className="min-w-6 text-center">{l.qty}</span>
                  <button className="min-w-9 min-h-9" onClick={() => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 border-t flex items-center gap-3">
          <div className="font-bold text-lg">{formatVnd(total)}</div>
          {err && <span className="text-sm text-red-700">{err}</span>}
          <button
            className="btn-primary ml-auto"
            disabled={lines.length === 0 || send.isPending}
            onClick={() => send.mutate(undefined, { onSuccess: onClose, onError: (e) => setErr((e as Error).message) })}
          >
            Gửi xuống bếp
          </button>
        </div>
        {picking && (
          <ModifierDialog
            item={picking}
            onCancel={() => setPicking(null)}
            onDone={(mods) => { setLines((ls) => [...ls, { key: crypto.randomUUID(), item: picking, qty: 1, modifiers: mods }]); setPicking(null); }}
          />
        )}
      </div>
    </div>
  );
}

function ModifierDialog({ item, onCancel, onDone }: { item: MenuItem; onCancel: () => void; onDone: (m: { groupId: string; modifierId: string }[]) => void }) {
  const [picked, setPicked] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(item.modifierGroups.map((g) => [g.id, g.required && g.maxSelect === 1 && g.modifiers[0] ? [g.modifiers[0].id] : []])),
  );
  const invalid = item.modifierGroups.find((g) => g.required && (picked[g.id]?.length ?? 0) < Math.max(1, g.minSelect));
  return (
    <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="card p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">{item.nameVi}</h3>
        {item.modifierGroups.map((g) => (
          <div key={g.id}>
            <div className="text-sm font-semibold mb-1">{g.name} {g.required && <span className="text-red-600">*</span>}</div>
            <div className="flex flex-wrap gap-2">
              {g.modifiers.filter((m) => m.isAvailable).map((m) => {
                const on = picked[g.id]?.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      setPicked((p) => {
                        const cur = p[g.id] ?? [];
                        if (g.maxSelect === 1) return { ...p, [g.id]: [m.id] };
                        if (cur.includes(m.id)) return { ...p, [g.id]: cur.filter((x) => x !== m.id) };
                        return cur.length >= g.maxSelect ? p : { ...p, [g.id]: [...cur, m.id] };
                      })
                    }
                    className={`min-h-10 px-3 rounded-lg border ${on ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300'}`}
                  >
                    {m.name}{m.priceDelta ? ` +${formatVnd(m.priceDelta)}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-2 justify-end">
          <button className="btn-ghost" onClick={onCancel}>Hủy</button>
          <button className="btn-primary" disabled={!!invalid} onClick={() => onDone(item.modifierGroups.flatMap((g) => (picked[g.id] ?? []).map((modifierId) => ({ groupId: g.id, modifierId }))))}>Thêm</button>
        </div>
      </div>
    </div>
  );
}
