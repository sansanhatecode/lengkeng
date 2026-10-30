import type { APIRequestContext } from '@playwright/test';

export const API = 'http://localhost:3000';

/**
 * Lấy mã QR của một bàn đang trống qua API (đăng nhập chủ quán).
 * Các test chạy song song nên mỗi test lấy ở một đầu danh sách để không giẫm lên nhau.
 */
export async function freeTableQr(request: APIRequestContext, pick: 'first' | 'last' = 'first') {
  const login = await request.post(`${API}/auth/login`, { data: { email: 'owner@demo.vn', password: 'password123' } });
  const { staffToken } = await login.json();
  const floor = await (await request.get(`${API}/s/floor`, { headers: { Authorization: `Bearer ${staffToken}` } })).json();
  const free = floor.flatMap((a: any) => a.tables).filter((t: any) => !t.session && t.status === 'FREE');
  const table = pick === 'first' ? free[0] : free[free.length - 1];
  if (!table) throw new Error('Không còn bàn trống để test');
  return { qrToken: table.qrToken as string, tableName: table.name as string, staffToken: staffToken as string };
}
