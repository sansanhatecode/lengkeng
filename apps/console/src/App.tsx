import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './lib/auth';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { PinPage } from './pages/PinPage';
import { KdsPage } from './pages/KdsPage';
import { WaiterPage } from './pages/WaiterPage';
import { CashierPage } from './pages/CashierPage';
import { MenuAdminPage } from './pages/admin/MenuAdminPage';
import { TablesAdminPage } from './pages/admin/TablesAdminPage';
import { StaffAdminPage } from './pages/admin/StaffAdminPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { RegisterPage } from './pages/RegisterPage';
import { usePlatform } from './lib/platform';
import { PlatformLoginPage } from './pages/platform/PlatformLoginPage';
import { PlatformStoresPage } from './pages/platform/PlatformStoresPage';

const homeFor = (role: string) =>
  role === 'KITCHEN' ? '/kds' : role === 'CASHIER' ? '/cashier' : role === 'WAITER' ? '/waiter' : '/admin/menu';

/** Khu quản trị hệ thống dùng phiên riêng, không dính tới phiên nhân viên quán. */
function PlatformArea() {
  const { session } = usePlatform();
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/sys" replace /> : <PlatformLoginPage />} />
      <Route path="/" element={session ? <PlatformStoresPage /> : <Navigate to="/sys/login" replace />} />
      <Route path="*" element={<Navigate to="/sys" replace />} />
    </Routes>
  );
}

export function App() {
  const { session, deviceToken } = useAuth();
  if (location.pathname.startsWith('/sys')) {
    return (
      <Routes>
        <Route path="/sys/*" element={<PlatformArea />} />
      </Routes>
    );
  }
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pin" element={deviceToken ? <PinPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={deviceToken ? '/pin' : '/login'} replace />} />
      </Routes>
    );
  }
  const isManager = session.staff.role === 'OWNER' || session.staff.role === 'MANAGER';
  return (
    <Routes>
      <Route path="/pin" element={<PinPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/admin/tables" replace />} />
      <Route element={<Shell />}>
        <Route path="/waiter" element={<WaiterPage />} />
        <Route path="/kds" element={<KdsPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        {isManager && (
          <>
            <Route path="/admin/menu" element={<MenuAdminPage />} />
            <Route path="/admin/tables" element={<TablesAdminPage />} />
            <Route path="/admin/staff" element={<StaffAdminPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to={homeFor(session.staff.role)} replace />} />
      </Route>
    </Routes>
  );
}
