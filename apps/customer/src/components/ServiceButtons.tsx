import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../lib/session';
import { useSessionState } from '../lib/cart';

/** K6: gọi phục vụ, yêu cầu tính tiền. Một nút, một lần bấm. */
export function ServiceButtons({ compact = false }: { compact?: boolean }) {
  const { token } = useSession();
  const state = useSessionState();
  const [msg, setMsg] = useState<string | null>(null);
  const open = new Set(state.data?.openRequests.map((r) => r.type));

  const m = useMutation({
    mutationFn: (type: 'CALL_WAITER' | 'REQUEST_BILL') => api('/c/service-requests', { method: 'POST', body: { type }, token }),
    onSuccess: (_, type) => {
      setMsg(type === 'CALL_WAITER' ? 'Đã gọi, nhân viên sẽ tới ngay' : 'Đã báo thu ngân, vui lòng chờ chút');
      void state.refetch();
      setTimeout(() => setMsg(null), 3000);
    },
    onError: (e) => {
      setMsg(e instanceof ApiError ? e.message : 'Không gửi được, thử lại');
      setTimeout(() => setMsg(null), 3000);
    },
  });

  const base = compact
    ? 'min-h-11 px-3 rounded-lg text-sm font-semibold bg-white/15 text-white disabled:opacity-60'
    : 'btn-ghost flex-1';
  return (
    <div className="relative flex gap-2">
      <button className={base} disabled={m.isPending || open.has('CALL_WAITER')} onClick={() => m.mutate('CALL_WAITER')}>
        🙋 {open.has('CALL_WAITER') ? 'Đã gọi' : 'Gọi NV'}
      </button>
      <button className={base} disabled={m.isPending || open.has('REQUEST_BILL')} onClick={() => m.mutate('REQUEST_BILL')}>
        💵 {open.has('REQUEST_BILL') ? 'Đang tính' : 'Tính tiền'}
      </button>
      {msg && (
        <div className="absolute top-full right-0 mt-2 bg-stone-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg whitespace-nowrap z-30">{msg}</div>
      )}
    </div>
  );
}
