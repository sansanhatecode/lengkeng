import { useState } from 'react';
import { formatVnd, KITCHEN_STATUS_LABEL } from '@lengkeng/shared';
import { useAction, useFloor, useOrders, useRequests } from '../lib/queries';
import { minutesSince, time } from '../lib/format';
import { FloorGrid } from '../components/FloorGrid';
import { MenuPicker } from '../components/MenuPicker';
import type { FloorTable } from '../lib/types';

/** V1 + V2 + V3: màn hình phục vụ. */
export function WaiterPage() {
  const floor = useFloor();
  const pending = useOrders('PENDING_CONFIRM');
  const requests = useRequests();
  const todays = useOrders();
  const [sel, setSel] = useState<FloorTable | null>(null);
  const [picker, setPicker] = useState(false);

  const approve = useAction<string>((f, id) => f(`/s/orders/${id}/approve`, { method: 'POST' }), ['orders', 'floor', 'kitchen']);
  const reject = useAction<{ id: string; reason?: string }>((f, v) => f(`/s/orders/${v.id}/reject`, { method: 'POST', body: { reason: v.reason } }), ['orders', 'floor']);
  const handle = useAction<string>((f, id) => f(`/s/service-requests/${id}/handle`, { method: 'POST' }), ['requests', 'floor']);
  const open = useAction<string>((f, id) => f(`/s/tables/${id}/open-session`, { method: 'POST', body: {} }), ['floor']);
  const served = useAction<string>((f, id) => f(`/s/order-items/${id}/status`, { method: 'PATCH', body: { status: 'SERVED' } }), ['orders', 'floor', 'kitchen']);
  const voidSession = useAction<string>((f, id) => f(`/s/sessions/${id}/void`, { method: 'POST' }), ['floor', 'orders']);

  // Bàn đang chọn: lấy lại từ dữ liệu mới nhất
  const current = sel ? floor.data?.flatMap((a) => a.tables).find((t) => t.id === sel.id) ?? null : null;
  const tableOrders = current?.session ? (todays.data ?? []).filter((o) => o.session.id === current.session!.id && o.status === 'ACCEPTED') : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {((pending.data?.length ?? 0) > 0 || (requests.data?.length ?? 0) > 0) && (
          <section className="space-y-2">
            {requests.data?.map((r) => (
              <div key={r.id} className="card p-3 flex items-center gap-3 border-l-4 border-l-red-500">
                <div className="text-2xl">{r.type === 'CALL_WAITER' ? '🙋' : '💵'}</div>
                <div className="flex-1">
                  <div className="font-semibold">Bàn {r.session.table.name} · {r.type === 'CALL_WAITER' ? 'gọi phục vụ' : 'xin tính tiền'}</div>
                  <div className="text-sm text-slate-500">{minutesSince(r.createdAt)} phút trước</div>
                </div>
                <button className="btn-primary" onClick={() => handle.mutate(r.id)}>Đã xử lý</button>
              </div>
            ))}
            {pending.data?.map((o) => (
              <div key={o.id} className="card p-3 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Bàn {o.session.table.name} · Đơn #{o.dailyNumber} · {time(o.createdAt)}</div>
                  <div className="font-bold">{formatVnd(o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0))}</div>
                </div>
                <ul className="text-sm my-2">
                  {o.items.map((i) => (
                    <li key={i.id}>{i.qty}× {i.nameSnapshot}{i.modifiersSnapshot.length ? ` (${i.modifiersSnapshot.map((m) => m.name).join(', ')})` : ''}{i.note ? ` · “${i.note}”` : ''}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button className="btn-danger" onClick={() => { const reason = prompt('Lý do từ chối (không bắt buộc)') ?? undefined; reject.mutate({ id: o.id, reason }); }}>Từ chối</button>
                  <button className="btn-success flex-1" onClick={() => approve.mutate(o.id)}>Duyệt, gửi bếp</button>
                </div>
              </div>
            ))}
          </section>
        )}
        {floor.data && <FloorGrid areas={floor.data} selected={current?.id} onSelect={setSel} />}
      </div>

      <aside className="card p-3 h-fit lg:sticky lg:top-4">
        {!current ? (
          <p className="text-slate-500 text-sm">Chọn một bàn để xem chi tiết, mở bàn hoặc gọi món hộ.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Bàn {current.name}</h2>
              <button className="text-slate-400" onClick={() => setSel(null)}>Đóng</button>
            </div>
            {!current.session ? (
              <>
                <p className="text-sm text-slate-500">Bàn trống. Mở bàn để gọi món hộ khách, hoặc để khách tự quét QR.</p>
                <button className="btn-primary w-full" disabled={current.status === 'LOCKED'} onClick={() => open.mutate(current.id)}>Mở bàn</button>
              </>
            ) : (
              <>
                <div className="text-sm text-slate-600">Mở lúc {time(current.session.openedAt)} · tạm tính <b>{formatVnd(current.session.subtotal)}</b></div>
                <button className="btn-primary w-full" onClick={() => setPicker(true)}>＋ Gọi món hộ</button>
                <div className="space-y-2 max-h-[50dvh] overflow-y-auto">
                  {tableOrders.map((o) => (
                    <div key={o.id} className="border rounded-lg p-2">
                      <div className="text-sm font-semibold text-slate-600">Đơn #{o.dailyNumber} · {time(o.createdAt)}</div>
                      <ul className="divide-y">
                        {o.items.map((i) => (
                          <li key={i.id} className="py-1.5 flex items-center gap-2 text-sm">
                            <span className="flex-1">{i.qty}× {i.nameSnapshot}</span>
                            {i.kitchenStatus === 'DONE' ? (
                              <button className="btn-success min-h-9 px-3 text-xs" onClick={() => served.mutate(i.id)}>Đã mang ra</button>
                            ) : (
                              <span className={`text-xs rounded-full px-2 py-0.5 ${i.kitchenStatus === 'SERVED' ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>{KITCHEN_STATUS_LABEL[i.kitchenStatus]}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {current.session.acceptedOrders === 0 && current.session.pendingOrders === 0 && (
                  <button className="btn-ghost w-full text-red-700" onClick={() => confirm('Hủy phiên bàn này? Bàn sẽ về trạng thái trống.') && voidSession.mutate(current.session!.id)}>Hủy phiên (khách bỏ đi)</button>
                )}
              </>
            )}
          </div>
        )}
      </aside>
      {picker && current?.session && <MenuPicker sessionId={current.session.id} tableName={current.name} onClose={() => setPicker(false)} />}
    </div>
  );
}
