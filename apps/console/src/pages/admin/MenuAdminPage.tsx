import { useState, type FormEvent } from 'react';
import { formatVnd, type Station } from '@lengkeng/shared';
import { useAction, useFullMenu } from '../../lib/queries';
import type { Category, MenuItem } from '../../lib/types';

/** Q1: quản lý menu. */
export function MenuAdminPage() {
  const menu = useFullMenu();
  const [editItem, setEditItem] = useState<{ item: MenuItem | null; categoryId: string } | null>(null);
  const [editCat, setEditCat] = useState<Category | 'new' | null>(null);
  const toggle = useAction<MenuItem>((f, i) => f(`/s/menu/items/${i.id}/availability`, { method: 'PATCH', body: { isAvailable: !i.isAvailable } }), ['menu']);
  const delItem = useAction<string>((f, id) => f(`/s/menu/items/${id}`, { method: 'DELETE' }), ['menu']);
  const delCat = useAction<string>((f, id) => f(`/s/menu/categories/${id}`, { method: 'DELETE' }), ['menu']);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Menu</h1>
        <button className="btn-primary" onClick={() => setEditCat('new')}>＋ Danh mục</button>
      </div>
      {menu.data?.map((c) => (
        <section key={c.id} className="card">
          <div className="p-3 flex items-center gap-2 border-b">
            <h2 className="font-semibold text-lg flex-1">{c.nameVi}{c.availableFrom && c.availableTo ? <span className="text-sm font-normal text-slate-500"> · {c.availableFrom}–{c.availableTo}</span> : null}</h2>
            <button className="btn-ghost min-h-9 text-sm" onClick={() => setEditItem({ item: null, categoryId: c.id })}>＋ Món</button>
            <button className="btn-ghost min-h-9 text-sm" onClick={() => setEditCat(c)}>Sửa</button>
            <button className="text-sm text-slate-400 underline" onClick={() => confirm('Xóa danh mục?') && delCat.mutate(c.id, { onError: (e) => alert((e as Error).message) })}>Xóa</button>
          </div>
          <div className="divide-y">
            {c.items.map((i) => (
              <div key={i.id} className={`p-3 flex items-center gap-3 ${i.isAvailable ? '' : 'bg-red-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{i.nameVi} <span className="text-xs text-slate-400">{i.station === 'BAR' ? 'Bar' : 'Bếp'}</span></div>
                  <div className="text-sm text-slate-500">{formatVnd(i.price)}{i.modifierGroups.length ? ` · ${i.modifierGroups.map((g) => g.name).join(', ')}` : ''}{i.tags.length ? ` · ${i.tags.join(', ')}` : ''}</div>
                </div>
                <button className={`min-h-9 px-3 rounded-lg text-sm font-semibold ${i.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-600 text-white'}`} onClick={() => toggle.mutate(i)}>{i.isAvailable ? 'Còn' : 'Hết'}</button>
                <button className="btn-ghost min-h-9 text-sm" onClick={() => setEditItem({ item: i, categoryId: c.id })}>Sửa</button>
                <button className="text-sm text-red-600 underline" onClick={() => confirm(`Xóa "${i.nameVi}"?`) && delItem.mutate(i.id)}>Xóa</button>
              </div>
            ))}
            {c.items.length === 0 && <p className="p-3 text-sm text-slate-400">Chưa có món.</p>}
          </div>
        </section>
      ))}
      {editCat && <CategoryForm cat={editCat === 'new' ? null : editCat} count={menu.data?.length ?? 0} onClose={() => setEditCat(null)} />}
      {editItem && <ItemForm item={editItem.item} categoryId={editItem.categoryId} categories={menu.data ?? []} onClose={() => setEditItem(null)} />}
    </div>
  );
}

function CategoryForm({ cat, count, onClose }: { cat: Category | null; count: number; onClose: () => void }) {
  const [nameVi, setNameVi] = useState(cat?.nameVi ?? '');
  const [nameEn, setNameEn] = useState(cat?.nameEn ?? '');
  const [from, setFrom] = useState(cat?.availableFrom ?? '');
  const [to, setTo] = useState(cat?.availableTo ?? '');
  const save = useAction((f) =>
    f(cat ? `/s/menu/categories/${cat.id}` : '/s/menu/categories', {
      method: cat ? 'PUT' : 'POST',
      body: { nameVi, nameEn: nameEn || undefined, sortOrder: cat?.sortOrder ?? count, availableFrom: from || null, availableTo: to || null },
    }),
    ['menu'],
  );
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined, { onSuccess: onClose }); };
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-bold text-lg">{cat ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
        <div><label className="label">Tên</label><input className="input" value={nameVi} onChange={(e) => setNameVi(e.target.value)} required /></div>
        <div><label className="label">Tên tiếng Anh</label><input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label">Bán từ</label><input className="input" type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">Đến</label><input className="input" type="time" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <p className="text-xs text-slate-500">Để trống khung giờ nếu bán cả ngày.</p>
        {save.isError && <p className="text-sm text-red-700">{(save.error as Error).message}</p>}
        <div className="flex gap-2 justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={save.isPending}>Lưu</button></div>
      </form>
    </Modal>
  );
}

type GroupDraft = { name: string; required: boolean; maxSelect: number; modifiers: { name: string; priceDelta: number }[] };

function ItemForm({ item, categoryId, categories, onClose }: { item: MenuItem | null; categoryId: string; categories: Category[]; onClose: () => void }) {
  const [f, setF] = useState({
    categoryId,
    nameVi: item?.nameVi ?? '',
    nameEn: item?.nameEn ?? '',
    descVi: item?.descVi ?? '',
    price: item?.price ?? 0,
    imageUrl: item?.imageUrl ?? '',
    station: (item?.station ?? 'KITCHEN') as Station,
    tags: item?.tags.join(', ') ?? '',
  });
  const [groups, setGroups] = useState<GroupDraft[]>(
    item?.modifierGroups.map((g) => ({ name: g.name, required: g.required, maxSelect: g.maxSelect, modifiers: g.modifiers.map((m) => ({ name: m.name, priceDelta: m.priceDelta })) })) ?? [],
  );
  const save = useAction((api) =>
    api(item ? `/s/menu/items/${item.id}` : '/s/menu/items', {
      method: item ? 'PUT' : 'POST',
      body: {
        categoryId: f.categoryId,
        nameVi: f.nameVi,
        nameEn: f.nameEn || undefined,
        descVi: f.descVi || undefined,
        price: Number(f.price),
        imageUrl: f.imageUrl || null,
        station: f.station,
        tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
        isAvailable: item?.isAvailable ?? true,
        sortOrder: item?.sortOrder ?? 0,
        modifierGroups: groups.filter((g) => g.name.trim()).map((g) => ({
          name: g.name,
          required: g.required,
          minSelect: g.required ? 1 : 0,
          maxSelect: Math.max(1, g.maxSelect),
          modifiers: g.modifiers.filter((m) => m.name.trim()).map((m) => ({ name: m.name, priceDelta: Number(m.priceDelta) || 0, isAvailable: true })),
        })),
      },
    }),
    ['menu'],
  );
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined, { onSuccess: onClose }); };
  const setG = (i: number, patch: Partial<GroupDraft>) => setGroups((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-bold text-lg">{item ? 'Sửa món' : 'Thêm món'}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Tên món</label><input className="input" value={f.nameVi} onChange={(e) => setF({ ...f, nameVi: e.target.value })} required /></div>
          <div><label className="label">Tên tiếng Anh</label><input className="input" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></div>
          <div><label className="label">Giá (VND)</label><input className="input" type="number" min={0} step={1000} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} required /></div>
          <div>
            <label className="label">Danh mục</label>
            <select className="input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameVi}</option>)}</select>
          </div>
          <div>
            <label className="label">Trạm</label>
            <select className="input" value={f.station} onChange={(e) => setF({ ...f, station: e.target.value as Station })}><option value="KITCHEN">Bếp</option><option value="BAR">Bar</option></select>
          </div>
          <div><label className="label">Nhãn (cách nhau dấu phẩy)</label><input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="bán chạy, cay, chay" /></div>
          <div className="sm:col-span-2"><label className="label">Mô tả</label><input className="input" value={f.descVi} onChange={(e) => setF({ ...f, descVi: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Link ảnh (tải ảnh lên R2 làm ở bước sau)</label><input className="input" type="url" value={f.imageUrl} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} /></div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Nhóm tùy chọn (size, topping, đường đá…)</h3><button type="button" className="btn-ghost min-h-9 text-sm" onClick={() => setGroups([...groups, { name: '', required: false, maxSelect: 1, modifiers: [{ name: '', priceDelta: 0 }] }])}>＋ Nhóm</button></div>
          {groups.map((g, i) => (
            <div key={i} className="border rounded-lg p-2 space-y-2 bg-slate-50">
              <div className="flex flex-wrap gap-2 items-center">
                <input className="input flex-1 min-w-40" placeholder="Tên nhóm, ví dụ: Size" value={g.name} onChange={(e) => setG(i, { name: e.target.value })} />
                <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={g.required} onChange={(e) => setG(i, { required: e.target.checked })} /> Bắt buộc</label>
                <label className="text-sm flex items-center gap-1">Chọn tối đa <input className="input w-16 min-h-9" type="number" min={1} value={g.maxSelect} onChange={(e) => setG(i, { maxSelect: Number(e.target.value) })} /></label>
                <button type="button" className="text-sm text-red-600 underline" onClick={() => setGroups(groups.filter((_, j) => j !== i))}>Xóa nhóm</button>
              </div>
              {g.modifiers.map((m, k) => (
                <div key={k} className="flex gap-2">
                  <input className="input flex-1 min-h-9" placeholder="Tên lựa chọn" value={m.name} onChange={(e) => setG(i, { modifiers: g.modifiers.map((x, l) => (l === k ? { ...x, name: e.target.value } : x)) })} />
                  <input className="input w-32 min-h-9" type="number" step={1000} placeholder="+ giá" value={m.priceDelta} onChange={(e) => setG(i, { modifiers: g.modifiers.map((x, l) => (l === k ? { ...x, priceDelta: Number(e.target.value) } : x)) })} />
                  <button type="button" className="text-slate-400 px-2" onClick={() => setG(i, { modifiers: g.modifiers.filter((_, l) => l !== k) })}>×</button>
                </div>
              ))}
              <button type="button" className="text-sm text-blue-700 underline" onClick={() => setG(i, { modifiers: [...g.modifiers, { name: '', priceDelta: 0 }] })}>＋ lựa chọn</button>
            </div>
          ))}
        </div>
        {save.isError && <p className="text-sm text-red-700">{(save.error as Error).message}</p>}
        <div className="flex gap-2 justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Hủy</button><button className="btn-primary" disabled={save.isPending}>Lưu món</button></div>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className={`card p-4 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} my-auto`} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
