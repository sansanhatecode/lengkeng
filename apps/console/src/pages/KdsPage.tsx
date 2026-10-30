import { useMemo, useState } from 'react';
import { KITCHEN_STATUS_LABEL } from '@lengkeng/shared';
import { useAction, useFullMenu, useKitchen } from '../lib/queries';
import { minutesSince, time } from '../lib/format';
import type { KitchenItem } from '../lib/types';

const NEXT: Record<string, 'COOKING' | 'DONE' | undefined> = { QUEUED: 'COOKING', COOKING: 'DONE' };
const LATE_MIN = 15;

/** B1 + B2 + B4: màn hình bếp. */
export function KdsPage() {
  const [station, setStation] = useState<'ALL' | 'KITCHEN' | 'BAR'>('ALL');
  const [showStock, setShowStock] = useState(false);
  const q = useKitchen(station === 'ALL' ? undefined : station);
  const setStatus = useAction<{ id: string; status: string }>((f, v) => f(`/s/order-items/${v.id}/status`, { method: 'PATCH', body: { status: v.status } }), ['kitchen']);

  const groups = useMemo(() => {
    const m = new Map<string, { order: KitchenItem['order']; items: KitchenItem[] }>();
    for (const it of q.data ?? []) {
      const g = m.get(it.order.id) ?? { order: it.order, items: [] };
      g.items.push(it);
      m.set(it.order.id, g);
    }
    return [...m.values()].sort((a, b) => a.order.createdAt.localeCompare(b.order.createdAt));
  }, [q.data]);

  const tab = (v: typeof station, label: string) => (
    <button onClick={() => setStation(v)} className={`min-h-11 px-4 rounded-lg font-semibold ${station === v ? 'bg-slate-900 text-white' : 'bg-white border border-slate-300'}`}>{label}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {tab('ALL', 'Tất cả')}{tab('KITCHEN', 'Bếp')}{tab('BAR', 'Bar')}
        <span className="text-slate-500 text-sm ml-2">{groups.length} đơn · {q.data?.length ?? 0} món</span>
        <button className="btn-ghost ml-auto" onClick={() => setShowStock((s) => !s)}>{showStock ? 'Đóng' : 'Báo hết món'}</button>
      </div>
      {showStock && <StockPanel />}
      {groups.length === 0 && !q.isLoading && <p className="text-center text-slate-500 py-16 text-lg">Chưa có món nào chờ làm 🎉</p>}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map(({ order, items }) => {
          const mins = minutesSince(order.approvedAt ?? order.createdAt);
          const late = mins >= LATE_MIN;
          const allDone = items.every((i) => i.kitchenStatus === 'DONE');
          return (
            <div key={order.id} className={`card overflow-hidden ${late ? 'ring-2 ring-red-500' : ''}`}>
              <div className={`px-3 py-2 flex items-center justify-between ${late ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`}>
                <div className="font-bold text-lg">{order.session.table.area.name} · {order.session.table.name}</div>
                <div className="text-sm">#{order.dailyNumber} · {time(order.createdAt)} · <b>{mins}′</b></div>
              </div>
              {order.note && <div className="px-3 py-1 bg-amber-50 text-amber-900 text-sm italic">Ghi chú đơn: {order.note}</div>}
              <ul className="divide-y divide-slate-100">
                {items.map((it) => {
                  const next = NEXT[it.kitchenStatus];
                  return (
                    <li key={it.id}>
                      <button
                        disabled={!next || setStatus.isPending}
                        onClick={() => next && setStatus.mutate({ id: it.id, status: next })}
                        className={`w-full text-left px-3 py-3 flex gap-3 items-start min-h-14 ${it.kitchenStatus === 'DONE' ? 'bg-green-50' : it.kitchenStatus === 'COOKING' ? 'bg-amber-50' : ''}`}
                      >
                        <span className="text-2xl font-bold w-10 shrink-0">{it.qty}×</span>
                        <span className="flex-1">
                          <span className={`text-lg font-semibold ${it.kitchenStatus === 'DONE' ? 'line-through text-slate-400' : ''}`}>{it.nameSnapshot}</span>
                          {it.modifiersSnapshot.length > 0 && <span className="block text-slate-600">{it.modifiersSnapshot.map((m) => m.name).join(', ')}</span>}
                          {it.note && <span className="block text-red-700 font-medium">“{it.note}”</span>}
                        </span>
                        <span className="text-xs font-semibold rounded-full px-2 py-1 bg-white border border-slate-200 shrink-0">
                          {KITCHEN_STATUS_LABEL[it.kitchenStatus]}{next ? ' →' : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!allDone && (
                <div className="p-2">
                  <button
                    className="btn-success w-full"
                    disabled={setStatus.isPending}
                    onClick={() => items.filter((i) => i.kitchenStatus !== 'DONE').forEach((i) => setStatus.mutate({ id: i.id, status: 'DONE' }))}
                  >
                    Xong cả đơn
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** B4: báo hết món / có lại. */
function StockPanel() {
  const menu = useFullMenu();
  const toggle = useAction<{ id: string; isAvailable: boolean }>((f, v) => f(`/s/menu/items/${v.id}/availability`, { method: 'PATCH', body: { isAvailable: v.isAvailable } }), ['menu']);
  const [filter, setFilter] = useState('');
  const items = (menu.data ?? []).flatMap((c) => c.items.map((i) => ({ ...i, cat: c.nameVi }))).filter((i) => i.nameVi.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="card p-3 space-y-2">
      <input className="input" placeholder="Tìm món…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-72 overflow-y-auto">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => toggle.mutate({ id: i.id, isAvailable: !i.isAvailable })}
            className={`min-h-12 rounded-lg px-3 text-left border font-medium ${i.isAvailable ? 'bg-white border-slate-200' : 'bg-red-50 border-red-300 text-red-800 line-through'}`}
          >
            {i.nameVi}<span className="block text-xs font-normal text-slate-500 no-underline">{i.isAvailable ? 'Còn' : 'Hết'} · {i.cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
