import { NavLink, Outlet } from 'react-router';
import { useSession } from '../lib/session';
import { useCart, useSessionState } from '../lib/cart';
import { ServiceButtons } from './ServiceButtons';

export function Layout() {
  const { data } = useSession();
  const { lines } = useCart();
  const state = useSessionState();
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);
  const activeOrders = state.data?.orders.filter((o) => o.status !== 'REJECTED' && o.status !== 'CANCELLED').length ?? 0;

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-sm font-medium min-h-14 ${isActive ? 'text-red-700' : 'text-stone-500'}`;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 bg-red-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <div>
          <div className="font-bold text-lg leading-tight">{data?.store.name}</div>
          <div className="text-red-100 text-sm">Bàn {data?.table.name} · {data?.table.area}</div>
        </div>
        <ServiceButtons compact />
      </header>
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-stone-200 flex pb-[env(safe-area-inset-bottom)]">
        <NavLink to="/menu" className={tab}>
          <span className="text-xl">🍽️</span>Menu
        </NavLink>
        <NavLink to="/cart" className={tab}>
          <span className="relative text-xl">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-700 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{cartCount}</span>
            )}
          </span>
          Giỏ
        </NavLink>
        <NavLink to="/orders" className={tab}>
          <span className="relative text-xl">
            🧾
            {activeOrders > 0 && (
              <span className="absolute -top-1 -right-2 bg-stone-700 text-white text-xs rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{activeOrders}</span>
            )}
          </span>
          Đã gọi
        </NavLink>
      </nav>
    </div>
  );
}
