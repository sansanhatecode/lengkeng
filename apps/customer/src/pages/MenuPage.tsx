import { useEffect, useRef, useState } from 'react';
import { formatVnd } from '@lengkeng/shared';
import { useMenu } from '../lib/cart';
import type { MenuItem } from '../lib/types';
import { ItemSheet } from '../components/ItemSheet';

/** K2: menu theo danh mục, món hết tự ẩn (server lọc). */
export function MenuPage() {
  const menu = useMenu();
  const [sel, setSel] = useState<MenuItem | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!active && menu.data?.[0]) setActive(menu.data[0].id);
  }, [menu.data, active]);

  if (menu.isLoading) return <p className="p-6 text-center text-stone-500">Đang tải menu…</p>;
  if (menu.isError) return <p className="p-6 text-center text-red-700">Không tải được menu. <button className="underline" onClick={() => menu.refetch()}>Thử lại</button></p>;
  const cats = menu.data ?? [];
  if (cats.length === 0) return <p className="p-6 text-center text-stone-500">Quán chưa có món nào đang bán.</p>;

  const jump = (id: string) => {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="sticky top-[64px] z-10 bg-orange-50/95 backdrop-blur border-b border-orange-100 overflow-x-auto flex gap-2 px-4 py-2">
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => jump(c.id)}
            className={`shrink-0 min-h-10 px-4 rounded-full text-sm font-semibold ${active === c.id ? 'bg-red-700 text-white' : 'bg-white border border-stone-200'}`}
          >
            {c.nameVi}
          </button>
        ))}
      </div>
      <div className="p-4 space-y-6">
        {cats.map((c) => (
          <section key={c.id} ref={(el) => { refs.current[c.id] = el; }} className="scroll-mt-28">
            <h2 className="text-lg font-bold mb-2">{c.nameVi}</h2>
            <div className="space-y-2">
              {c.items.map((it) => (
                <button key={it.id} onClick={() => setSel(it)} className="card w-full text-left p-3 flex gap-3 items-center active:bg-orange-50">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover bg-stone-100" loading="lazy" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center text-3xl">{it.station === 'BAR' ? '🥤' : '🍲'}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold leading-snug">{it.nameVi}</div>
                    {it.descVi && <div className="text-sm text-stone-500 line-clamp-2">{it.descVi}</div>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-bold text-red-700">{formatVnd(it.price)}</span>
                      {it.tags.map((t) => (
                        <span key={t} className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-10 min-h-10 rounded-full bg-red-700 text-white flex items-center justify-center text-xl">+</div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {sel && <ItemSheet item={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
