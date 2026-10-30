import { NavLink, Outlet, useNavigate } from 'react-router';
import { STAFF_ROLE_LABEL } from '@lengkeng/shared';
import { useAuth } from '../lib/auth';
import { useStaffRealtime } from '../lib/realtime';
import { useOrders, useRequests } from '../lib/queries';

export function Shell() {
  const { session, deviceToken, logoutStaff, forgetDevice } = useAuth();
  const nav = useNavigate();
  const connected = useStaffRealtime(session?.token ?? null);
  const pending = useOrders('PENDING_CONFIRM');
  const requests = useRequests();
  const role = session!.staff.role;
  const isManager = role === 'OWNER' || role === 'MANAGER';
  const alerts = (pending.data?.length ?? 0) + (requests.data?.length ?? 0);

  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-200'}`;

  return (
    <div className="min-h-dvh flex flex-col">
      {!connected && (
        <div className="bg-red-600 text-white text-center text-sm py-1 font-semibold no-print">Mất kết nối máy chủ. Dữ liệu có thể cũ, đang tự kết nối lại…</div>
      )}
      <header className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto no-print">
        <div className="font-bold text-blue-800 mr-2 whitespace-nowrap">{session!.store.name}</div>
        <nav className="flex gap-1">
          {(isManager || role === 'WAITER' || role === 'CASHIER') && (
            <NavLink to="/waiter" className={link}>
              Phục vụ{alerts > 0 && <span className="ml-1 bg-red-600 text-white rounded-full px-1.5 text-xs">{alerts}</span>}
            </NavLink>
          )}
          {(isManager || role === 'KITCHEN' || role === 'WAITER') && <NavLink to="/kds" className={link}>Bếp</NavLink>}
          {(isManager || role === 'CASHIER') && <NavLink to="/cashier" className={link}>Thu ngân</NavLink>}
          {isManager && (
            <>
              <NavLink to="/admin/menu" className={link}>Menu</NavLink>
              <NavLink to="/admin/tables" className={link}>Bàn & QR</NavLink>
              <NavLink to="/admin/staff" className={link}>Nhân viên</NavLink>
              <NavLink to="/admin/settings" className={link}>Cài đặt</NavLink>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
          <span className="text-sm text-slate-600 hidden sm:inline">{session!.staff.name} · {STAFF_ROLE_LABEL[role]}</span>
          {deviceToken ? (
            <button className="btn-ghost min-h-9 px-3 text-sm" onClick={() => { logoutStaff(); nav('/pin'); }}>Đổi ca</button>
          ) : (
            <button className="btn-ghost min-h-9 px-3 text-sm" onClick={logoutStaff}>Đăng xuất</button>
          )}
          {isManager && deviceToken && (
            <button className="text-xs text-slate-400 underline" onClick={() => { if (confirm('Gỡ đăng nhập thiết bị này?')) forgetDevice(); }}>Gỡ thiết bị</button>
          )}
        </div>
      </header>
      <main className="flex-1 p-3 sm:p-4">
        <Outlet />
      </main>
    </div>
  );
}
