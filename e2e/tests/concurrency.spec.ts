import { test, expect } from '@playwright/test';
import { API, freeTableQr } from './helpers';

test('nhiều khách quét cùng một bàn cùng lúc chỉ tạo đúng một phiên', async ({ request }) => {
  const { qrToken, staffToken } = await freeTableQr(request, 'last');
  const results = await Promise.all(
    Array.from({ length: 6 }, () => request.post(`${API}/c/scan/${qrToken}`).then((r) => r.json())),
  );
  const sessionIds = new Set(results.map((r) => r.session.id));
  expect(sessionIds.size).toBe(1);

  // Dọn: hủy phiên trống vừa tạo để không ảnh hưởng test khác
  const [sessionId] = sessionIds;
  const res = await request.post(`${API}/s/sessions/${sessionId}/void`, { headers: { Authorization: `Bearer ${staffToken}` } });
  expect(res.ok()).toBeTruthy();
});
