import { formatVnd, KITCHEN_STATUS_LABEL, ORDER_STATUS_LABEL } from '@lengkeng/shared';
import { useSessionState } from '../lib/cart';
import { ServiceButtons } from '../components/ServiceButtons';

const chip: Record<string, string> = {
  QUEUED: 'bg-stone-100 text-stone-600',
  COOKING: 'bg-amber-100 text-amber-800',
  DONE: 'bg-green-100 text-green-800',
  SERVED: 'bg-green-600 text-white',
};

/** K5: trạng thái từng món, realtime từ bếp. */
export function OrdersPage() {
  const s = useSessionState();
  const orders = s.data?.orders ?? [];
  if (s.isLoading) return <p className="p-6 text-center text-stone-500">Đang tải…</p>;

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold">Món đã gọi</h1>
      {orders.length === 0 && <p className="text-stone-500">Chưa có đơn nào. Thêm món từ menu rồi gửi.</p>}
      {[...orders].reverse().map((o) => (
        <div key={o.id} className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Đơn #{o.dailyNumber} · {new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
            <span className={`text-xs font-semibold rounded-full px-2 py-1 ${o.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : o.status === 'PENDING_CONFIRM' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
              {ORDER_STATUS_LABEL[o.status]}
            </span>
          </div>
          {o.status === 'REJECTED' && <p className="text-sm text-red-700 mb-2">Nhân viên từ chối{o.rejectReason ? `: ${o.rejectReason}` : ''}. Hãy hỏi nhân viên.</p>}
          <ul className="divide-y divide-stone-100">
            {o.items.map((i) => (
              <li key={i.id} className="py-2 flex justify-between gap-2">
                <div>
                  <div><span className="font-semibold">{i.qty}×</span> {i.nameSnapshot}</div>
                  {i.modifiersSnapshot.length > 0 && <div className="text-sm text-stone-500">{i.modifiersSnapshot.map((m) => m.name).join(', ')}</div>}
                  {i.note && <div className="text-sm text-stone-500 italic">“{i.note}”</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">{formatVnd(i.unitPrice * i.qty)}</div>
                  {o.status === 'ACCEPTED' && <span className={`text-xs rounded-full px-2 py-0.5 ${chip[i.kitchenStatus]}`}>{KITCHEN_STATUS_LABEL[i.kitchenStatus]}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {orders.length > 0 && (
        <div className="card p-4 flex items-center justify-between">
          <span className="text-stone-600">Tạm tính (đơn đã nhận)</span>
          <span className="text-xl font-bold">{formatVnd(s.data?.subtotal ?? 0)}</span>
        </div>
      )}
      <ServiceButtons />
    </div>
  );
}
