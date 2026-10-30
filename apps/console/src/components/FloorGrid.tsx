import { minutesSince } from '../lib/format';
import { formatVnd } from '@lengkeng/shared';
import type { FloorArea, FloorTable } from '../lib/types';

export function FloorGrid({ areas, selected, onSelect }: { areas: FloorArea[]; selected?: string | null; onSelect: (t: FloorTable) => void }) {
  return (
    <div className="space-y-4">
      {areas.map((a) => (
        <section key={a.id}>
          <h3 className="font-semibold text-slate-600 mb-2">{a.name}</h3>
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {a.tables.map((t) => {
              const s = t.session;
              const alert = s && (s.pendingOrders > 0 || s.openRequests.length > 0);
              return (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className={`relative rounded-xl p-2 min-h-20 text-left border-2 transition ${
                    selected === t.id ? 'border-blue-700' : 'border-transparent'
                  } ${t.status === 'LOCKED' ? 'bg-slate-200 text-slate-500' : s ? (alert ? 'bg-amber-100' : 'bg-blue-100') : 'bg-white shadow-sm'}`}
                >
                  <div className="font-bold text-lg">{t.name}</div>
                  {s ? (
                    <div className="text-xs text-slate-700">
                      <div>{minutesSince(s.openedAt)}′ · {formatVnd(s.subtotal)}</div>
                      {s.pendingOrders > 0 && <div className="text-red-700 font-semibold">{s.pendingOrders} đơn chờ duyệt</div>}
                      {s.openRequests.map((r) => (
                        <div key={r.id} className="text-red-700 font-semibold">{r.type === 'CALL_WAITER' ? '🙋 Gọi phục vụ' : '💵 Xin tính tiền'}</div>
                      ))}
                      {s.itemsNotServed > 0 && !alert && <div>{s.itemsNotServed} món chưa ra</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">{t.status === 'LOCKED' ? 'Khóa' : 'Trống'}</div>
                  )}
                  {alert && <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-600 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
