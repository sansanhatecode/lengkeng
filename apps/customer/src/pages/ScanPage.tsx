import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import type { ScanResult } from '../lib/types';

/** K1: quét QR là vào đúng quán, đúng bàn. */
export function ScanPage() {
  const { qrToken } = useParams();
  const nav = useNavigate();
  const { save, clear } = useSession();
  const [error, setError] = useState<{ title: string; hint: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        clear();
        const r = await api<ScanResult>(`/c/scan/${qrToken}`, { method: 'POST' });
        if (cancelled) return;
        save(r);
        nav('/menu', { replace: true });
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.body?.code === 'WAIT_FOR_STAFF') {
          setError({ title: 'Vui lòng chờ nhân viên mở bàn', hint: 'Quán này cần nhân viên xác nhận bàn trước. Bạn có thể quét lại sau vài phút.' });
        } else if (e instanceof ApiError && e.body?.code === 'STORE_SUSPENDED') {
          setError({ title: 'Quán tạm ngưng nhận đơn qua QR', hint: 'Vui lòng gọi nhân viên để gọi món trực tiếp.' });
        } else if (e instanceof ApiError && e.body?.code === 'TABLE_LOCKED') {
          setError({ title: 'Bàn này hiện không nhận đơn', hint: 'Hãy gọi nhân viên để được hỗ trợ.' });
        } else if (e instanceof ApiError && e.status === 404) {
          setError({ title: 'Mã QR không hợp lệ', hint: 'Tem có thể đã được in lại. Hãy gọi nhân viên.' });
        } else {
          setError({ title: 'Không kết nối được', hint: 'Kiểm tra mạng rồi quét lại.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qrToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-3">
      {error ? (
        <>
          <div className="text-5xl">😕</div>
          <h1 className="text-xl font-bold">{error.title}</h1>
          <p className="text-stone-600">{error.hint}</p>
          <button className="btn-primary mt-2" onClick={() => location.reload()}>Thử lại</button>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full border-4 border-red-200 border-t-red-700 animate-spin" />
          <p className="text-stone-600">Đang mở menu…</p>
        </>
      )}
    </main>
  );
}
