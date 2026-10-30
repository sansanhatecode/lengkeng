import { useEffect, useState } from 'react';
import { formatVnd, KITCHEN_STATUS_LABEL } from '@lengkeng/shared';
import { useAction, useBill, useFloor } from '../lib/queries';
import { time } from '../lib/format';
import { FloorGrid } from '../components/FloorGrid';
import type { FloorTable } from '../lib/types';

type Method = 'CASH' | 'BANK_TRANSFER' | 'VIETQR';
const METHOD_LABEL: Record<Method, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản', VIETQR: 'VietQR' };

/** T1 + T3 (+ T2 cơ bản): thu ngân xem hóa đơn, thu tiền, đóng bàn. */
export function CashierPage() {
  const floor = useFloor();
  const [sel, setSel] = useState<FloorTable | null>(null);
  const [discount, setDiscount] = useState(0);
  const [surcharge, setSurcharge] = useState(0);
  const [method, setMethod] = useState<Method>('CASH');
  const [received, setReceived] = useState<number | ''>('');
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const current = sel ? floor.data?.flatMap((a) => a.tables).find((t) => t.id === sel.id) ?? null : null;
  const sessionId = current?.session?.id ?? null;
  const bill = useBill(sessionId, discount, surcharge);

  useEffect(() => {
    setDiscount(0); setSurcharge(0); setReceived(''); setErr(null);
    if (sessionId) setDone(null); // chỉ xóa thông báo khi chọn bàn mới, không xóa khi bàn vừa đóng biến mất
  }, [sessionId]);

  const close = useAction((f) =>
    f(`/s/sessions/${sessionId}/close`, {
      method: 'POST',
      body: { discount, surcharge, payments: [{ method, amount: received === '' ? bill.data?.total ?? 0 : received }] },
    }),
    ['floor', 'orders', 'kitchen', 'requests', 'bill'],
  );
  const voidSession = useAction((f) => f(`/s/sessions/${sessionId}/void`, { method: 'POST' }), ['floor', 'orders']);

  const total = bill.data?.total ?? 0;
  const paid = received === '' ? total : received;
  const change = Math.max(0, paid - total);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div>{floor.data && <FloorGrid areas={floor.data} selected={current?.id} onSelect={setSel} />}</div>
      <aside className="card p-4 h-fit lg:sticky lg:top-4 space-y-3">
        {!current && <p className="text-slate-500 text-sm">Chọn bàn đang có khách để xem hóa đơn.</p>}
        {current && !current.session && !done && <p className="text-slate-500">Bàn {current.name} đang trống.</p>}
        {done && <div className="text-center py-6 space-y-2"><div className="text-4xl">✅</div><p className="font-semibold">Đã đóng bàn {done}</p></div>}
        {current?.session && bill.data && (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Bàn {bill.data.table.name}</h2>
              <span className="text-sm text-slate-500">mở {time(bill.data.openedAt)}</span>
            </div>
            {current.session.pendingOrders > 0 && <p className="text-sm bg-amber-50 text-amber-800 rounded-lg p-2">Còn {current.session.pendingOrders} đơn chờ duyệt. Duyệt hoặc từ chối ở màn Phục vụ trước khi đóng bàn.</p>}
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {bill.data.lines.map((l) => (
                  <tr key={l.itemId}>
                    <td className="py-1.5 pr-2">
                      <div>{l.qty}× {l.name}</div>
                      {l.modifiers.length > 0 && <div className="text-xs text-slate-500">{l.modifiers.map((m) => m.name).join(', ')}</div>}
                      {l.kitchenStatus !== 'SERVED' && <div className="text-xs text-amber-700">{KITCHEN_STATUS_LABEL[l.kitchenStatus]}</div>}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">{formatVnd(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t pt-2 space-y-1 text-sm">
              <Row label="Tạm tính" value={formatVnd(bill.data.subtotal)} />
              <div className="flex items-center justify-between gap-2"><span>Giảm giá</span><input type="number" min={0} className="input max-w-36 text-right min-h-9" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} /></div>
              <div className="flex items-center justify-between gap-2"><span>Phụ thu</span><input type="number" min={0} className="input max-w-36 text-right min-h-9" value={surcharge} onChange={(e) => setSurcharge(Math.max(0, Number(e.target.value) || 0))} /></div>
              {bill.data.vatPercent > 0 && <Row label={`VAT ${bill.data.vatPercent}%`} value={formatVnd(bill.data.vat)} />}
              <div className="flex justify-between text-lg font-bold pt-1"><span>Tổng</span><span>{formatVnd(total)}</span></div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
                  <button key={m} onClick={() => setMethod(m)} className={`min-h-11 rounded-lg border font-semibold text-sm ${method === m ? 'bg-blue-700 text-white border-blue-700' : 'border-slate-300'}`}>{METHOD_LABEL[m]}</button>
                ))}
              </div>
              {method === 'VIETQR' && <p className="text-xs text-slate-500">VietQR tự đối soát (K7) làm ở giai đoạn thí điểm. Hiện ghi nhận như chuyển khoản đã kiểm tra tay.</p>}
              {method === 'CASH' && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>Khách đưa</span>
                  <input type="number" className="input max-w-40 text-right" placeholder={String(total)} value={received} onChange={(e) => setReceived(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              )}
              {method === 'CASH' && change > 0 && <Row label="Tiền thừa" value={formatVnd(change)} />}
            </div>
            {err && <p className="text-sm text-red-700">{err}</p>}
            <button
              className="btn-success w-full text-lg"
              disabled={close.isPending || total === 0 || current.session.pendingOrders > 0 || paid < total}
              onClick={() => close.mutate(undefined, { onSuccess: () => { setDone(current.name); setSel(null); }, onError: (e) => setErr((e as Error).message) })}
            >
              Thu {formatVnd(total)} & đóng bàn
            </button>
            {total === 0 && <button className="btn-ghost w-full text-red-700" onClick={() => voidSession.mutate(undefined, { onSuccess: () => setSel(null) })}>Hủy phiên trống</button>}
          </>
        )}
      </aside>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>
);
