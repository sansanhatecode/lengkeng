import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { formatVnd } from '@lengkeng/shared';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { priceOf, useCart, useMenu } from '../lib/cart';
import type { Order } from '../lib/types';

const KEY_KEY = 'lk.pendingOrderKey';

/** K4: giỏ chung của bàn, gửi đơn. Gửi lỗi mạng thì thử lại với cùng idempotencyKey, không tạo đơn trùng. */
export function CartPage() {
  const { token } = useSession();
  const { lines, setQty, clear } = useCart();
  const menu = useMenu();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const items = useMemo(() => new Map((menu.data ?? []).flatMap((c) => c.items).map((i) => [i.id, i])), [menu.data]);

  const rows = lines.map((l) => {
    const item = items.get(l.menuItemId);
    const modIds = l.modifiers.map((m) => m.modifierId);
    const unit = item ? priceOf(item, modIds) : 0;
    const modNames = item ? item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => modIds.includes(m.id)).map((m) => m.name) : [];
    return { l, item, unit, modNames, missing: !item };
  });
  const total = rows.reduce((s, r) => s + r.unit * r.l.qty, 0);
  const hasMissing = rows.some((r) => r.missing);

  const send = useMutation({
    retry: 3,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    mutationFn: async () => {
      let key = sessionStorage.getItem(KEY_KEY);
      if (!key) {
        key = crypto.randomUUID();
        sessionStorage.setItem(KEY_KEY, key);
      }
      return api<Order>('/c/orders', {
        method: 'POST',
        token,
        body: { idempotencyKey: key, lines: lines.map(({ menuItemId, qty, modifiers, note }) => ({ menuItemId, qty, modifiers, note })) },
      });
    },
    onSuccess: () => {
      sessionStorage.removeItem(KEY_KEY);
      void qc.invalidateQueries({ queryKey: ['session'] });
      nav('/orders');
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        sessionStorage.removeItem(KEY_KEY); // lỗi nghiệp vụ: lần sau là đơn mới
        setErr(e.message);
        if (e.status === 400) void qc.invalidateQueries({ queryKey: ['menu'] });
      } else setErr('Mất kết nối, đã thử lại nhiều lần. Kiểm tra mạng rồi bấm gửi lại.');
    },
  });

  if (lines.length === 0)
    return (
      <div className="p-6 text-center text-stone-500 space-y-3">
        <div className="text-5xl">🛒</div>
        <p>Giỏ đang trống. Cả bàn cùng thêm món vào đây rồi gửi một lần.</p>
        <button className="btn-primary" onClick={() => nav('/menu')}>Xem menu</button>
      </div>
    );

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-bold">Giỏ của bàn</h1>
      {rows.map(({ l, item, unit, modNames, missing }) => (
        <div key={l.lineId} className={`card p-3 ${missing ? 'opacity-60' : ''}`}>
          <div className="flex justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{item?.nameVi ?? 'Món vừa hết'}</div>
              {modNames.length > 0 && <div className="text-sm text-stone-500">{modNames.join(', ')}</div>}
              {l.note && <div className="text-sm text-stone-500 italic">“{l.note}”</div>}
              {l.addedBy && <div className="text-xs text-stone-400 mt-0.5">{l.addedBy} thêm</div>}
            </div>
            <div className="text-right">
              <div className="font-bold">{formatVnd(unit * l.qty)}</div>
              <div className="flex items-center justify-end mt-1 rounded-lg border border-stone-200">
                <button className="min-w-10 min-h-10 text-lg" onClick={() => setQty(l.lineId, l.qty - 1)}>−</button>
                <span className="min-w-6 text-center">{l.qty}</span>
                <button className="min-w-10 min-h-10 text-lg" onClick={() => setQty(l.lineId, l.qty + 1)}>+</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {hasMissing && <p className="text-sm text-red-700">Có món vừa hết, hãy bỏ khỏi giỏ trước khi gửi.</p>}
      {err && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{err}</p>}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-stone-600">Tạm tính</span>
        <span className="text-xl font-bold">{formatVnd(total)}</span>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={clear}>Xóa hết</button>
        <button className="btn-primary flex-1" disabled={send.isPending || hasMissing} onClick={() => { setErr(null); send.mutate(); }}>
          {send.isPending ? 'Đang gửi…' : 'Gửi đơn xuống bếp'}
        </button>
      </div>
    </div>
  );
}
