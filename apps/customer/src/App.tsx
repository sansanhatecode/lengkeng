import { useCallback } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from './lib/session';
import { useCustomerRealtime } from './lib/realtime';
import { ScanPage } from './pages/ScanPage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { ClosedPage } from './pages/ClosedPage';
import { Layout } from './components/Layout';

export function App() {
  const { token, clear } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const onClosed = useCallback(() => {
    clear();
    qc.clear();
    nav('/closed', { replace: true });
  }, [clear, nav, qc]);
  useCustomerRealtime(token, onClosed);

  return (
    <Routes>
      <Route path="/t/:qrToken" element={<ScanPage />} />
      <Route path="/closed" element={<ClosedPage />} />
      {token ? (
        <Route element={<Layout />}>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<NoSession />} />
      )}
    </Routes>
  );
}

function NoSession() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-3">
      <div className="text-5xl">📷</div>
      <h1 className="text-xl font-bold">Hãy quét mã QR trên bàn</h1>
      <p className="text-stone-600">Mã QR dán trên bàn sẽ mở đúng menu của quán và đúng bàn của bạn.</p>
    </main>
  );
}
