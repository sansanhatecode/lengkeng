import { useMemo, useState } from 'react';
import { formatVnd } from '@lengkeng/shared';
import type { MenuItem } from '../lib/types';
import { priceOf, useCart } from '../lib/cart';

/** K3: chọn size/topping/ghi chú rồi thêm vào giỏ chung. */
export function ItemSheet({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.modifierGroups) init[g.id] = g.required && g.maxSelect === 1 && g.modifiers[0] ? [g.modifiers[0].id] : [];
    return init;
  });

  const allIds = useMemo(() => Object.values(picked).flat(), [picked]);
  const unit = priceOf(item, allIds);
  const invalid = item.modifierGroups.find((g) => g.required && (picked[g.id]?.length ?? 0) < Math.max(1, g.minSelect));

  const toggle = (gId: string, mId: string, max: number) =>
    setPicked((p) => {
      const cur = p[gId] ?? [];
      if (max === 1) return { ...p, [gId]: [mId] };
      if (cur.includes(mId)) return { ...p, [gId]: cur.filter((x) => x !== mId) };
      if (cur.length >= max) return p;
      return { ...p, [gId]: [...cur, mId] };
    });

  const submit = () => {
    add({
      menuItemId: item.id,
      qty,
      note: note.trim() || undefined,
      modifiers: item.modifierGroups.flatMap((g) => (picked[g.id] ?? []).map((modifierId) => ({ groupId: g.id, modifierId }))),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-stone-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{item.nameVi}</h2>
            {item.descVi && <p className="text-stone-600 text-sm mt-1">{item.descVi}</p>}
          </div>
          <button className="min-w-11 min-h-11 rounded-full bg-stone-100 text-xl" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-5">
          {item.modifierGroups.map((g) => (
            <section key={g.id}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-semibold">{g.name}</h3>
                <span className="text-xs text-stone-500">{g.required ? 'Bắt buộc' : 'Tùy chọn'}{g.maxSelect > 1 ? ` · tối đa ${g.maxSelect}` : ''}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {g.modifiers.map((m) => {
                  const on = picked[g.id]?.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(g.id, m.id, g.maxSelect)}
                      className={`min-h-12 rounded-xl border px-3 text-left flex items-center justify-between ${on ? 'border-red-700 bg-red-50 text-red-800' : 'border-stone-200'}`}
                    >
                      <span>{m.name}</span>
                      {m.priceDelta !== 0 && <span className="text-sm">+{formatVnd(m.priceDelta)}</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <section>
            <h3 className="font-semibold mb-2">Ghi chú cho bếp</h3>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Ví dụ: không hành, ít cay"
              className="w-full min-h-12 rounded-xl border border-stone-200 px-3"
            />
          </section>
        </div>
        <div className="p-4 border-t border-stone-100 flex items-center gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center rounded-xl border border-stone-200">
            <button className="min-w-12 min-h-12 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="min-w-8 text-center font-semibold">{qty}</span>
            <button className="min-w-12 min-h-12 text-xl" onClick={() => setQty((q) => Math.min(99, q + 1))}>+</button>
          </div>
          <button className="btn-primary flex-1" disabled={!!invalid} onClick={submit}>
            {invalid ? `Chọn ${invalid.name}` : `Thêm · ${formatVnd(unit * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
