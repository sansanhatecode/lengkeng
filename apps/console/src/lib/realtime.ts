import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeEvent } from '@lengkeng/shared';
import { SOCKET_URL } from './api';

let audioCtx: AudioContext | null = null;
/** Âm báo ngắn, không cần file. Trình duyệt chỉ cho phát sau khi người dùng đã chạm vào trang. */
export function beep(times = 1) {
  try {
    audioCtx ??= new AudioContext();
    for (let i = 0; i < times; i++) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.15;
      o.connect(g).connect(audioCtx.destination);
      const t = audioCtx.currentTime + i * 0.25;
      o.start(t);
      o.stop(t + 0.15);
    }
  } catch {}
}

/** Realtime cho nhân viên: làm mới dữ liệu và kêu khi có đơn mới hoặc khách gọi. Trả về trạng thái kết nối. */
export function useStaffRealtime(token: string | null) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    if (!token) return;
    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const inv = (...keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    s.on('connect', () => { setConnected(true); inv('floor', 'orders', 'kitchen', 'requests'); });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));
    s.on(RealtimeEvent.ORDER_CREATED, () => { inv('floor', 'orders', 'kitchen'); beep(2); });
    s.on(RealtimeEvent.ORDER_UPDATED, () => inv('floor', 'orders', 'kitchen', 'bill'));
    s.on(RealtimeEvent.ORDER_ITEM_UPDATED, () => inv('kitchen', 'floor', 'orders'));
    s.on(RealtimeEvent.SERVICE_REQUEST_CREATED, () => { inv('requests', 'floor'); beep(3); });
    s.on(RealtimeEvent.SERVICE_REQUEST_HANDLED, () => inv('requests', 'floor'));
    s.on(RealtimeEvent.SESSION_OPENED, () => inv('floor'));
    s.on(RealtimeEvent.SESSION_CLOSED, () => inv('floor', 'orders', 'kitchen', 'requests', 'bill'));
    s.on(RealtimeEvent.MENU_ITEM_AVAILABILITY, () => inv('menu'));
    return () => { s.disconnect(); };
  }, [token, qc]);
  return connected;
}
