import { test, expect, type Page } from '@playwright/test';
import { freeTableQr } from './helpers';

/** Mở app nhân viên trong một context riêng và đăng nhập bằng PIN qua thiết bị đã đăng nhập. */
async function staffPage(page: Page, pin: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@demo.vn');
  await page.getByLabel('Mật khẩu').fill('password123');
  await page.getByLabel('Tên thiết bị').fill('E2E tablet');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByRole('link', { name: /Phục vụ/ })).toBeVisible();
  await switchShift(page, pin);
}

/** Đổi ca bằng PIN và chờ vào được app (header có tên quán). */
async function switchShift(page: Page, pin: string) {
  await page.getByRole('button', { name: 'Đổi ca' }).click();
  await expect(page.getByRole('heading', { name: 'Nhập mã PIN' })).toBeVisible();
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('button', { name: 'Đổi ca' })).toBeVisible();
}

test('khách gọi món → phục vụ duyệt → bếp làm → thu ngân đóng bàn', async ({ browser, request }) => {
  const { qrToken, tableName } = await freeTableQr(request);

  // --- Khách (điện thoại) ---
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: 'http://localhost:5173' });
  const g = await guest.newPage();
  await g.goto(`/t/${qrToken}`);
  await expect(g.getByText(`Bàn ${tableName}`)).toBeVisible();
  await expect(g.getByRole('heading', { name: 'Món chính' })).toBeVisible();

  // Chọn món có tùy chọn bắt buộc (Lẩu thái) rồi thêm vào giỏ
  await g.getByRole('button', { name: /Lẩu thái hải sản/ }).click();
  await g.getByRole('button', { name: 'Cay nhiều' }).click();
  await g.getByPlaceholder('Ví dụ: không hành, ít cay').fill('nhiều rau');
  await g.getByRole('button', { name: /^Thêm · / }).click();
  // Thêm món không tùy chọn
  await g.getByRole('button', { name: /Cơm chiên hải sản/ }).click();
  await g.getByRole('button', { name: /^Thêm · / }).click();

  await g.getByRole('link', { name: /Giỏ/ }).click();
  await expect(g.getByText('Lẩu thái hải sản')).toBeVisible();
  await expect(g.getByText('“nhiều rau”')).toBeVisible();
  await g.getByRole('button', { name: 'Gửi đơn xuống bếp' }).click();
  await expect(g.getByText('Chờ xác nhận')).toBeVisible(); // đơn đầu phiên cần phục vụ duyệt

  // --- Phục vụ ---
  const staff = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const s = await staff.newPage();
  await staffPage(s, '1111');
  await s.goto('/waiter');
  const pendingCard = s.locator('.card', { hasText: `Bàn ${tableName} · Đơn #` }).first();
  await expect(pendingCard).toBeVisible();
  await pendingCard.getByRole('button', { name: 'Duyệt, gửi bếp' }).click();
  await expect(g.getByText('Đã nhận', { exact: true }).first()).toBeVisible({ timeout: 10_000 }); // khách thấy realtime

  // --- Bếp ---
  await switchShift(s, '2222');
  await s.goto('/kds');
  const kdsCard = s.locator('.card', { hasText: tableName }).first();
  await expect(kdsCard.getByText('Lẩu thái hải sản')).toBeVisible();
  await expect(kdsCard.getByText('“nhiều rau”')).toBeVisible();
  await kdsCard.getByRole('button', { name: 'Xong cả đơn' }).click();
  await expect(kdsCard).toBeHidden({ timeout: 10_000 }); // đơn xong thì rời khỏi màn bếp
  await expect(g.getByText('Đã xong').first()).toBeVisible({ timeout: 10_000 });

  // Khách yêu cầu tính tiền
  await g.getByRole('button', { name: /Tính tiền/ }).first().click();
  await expect(g.getByRole('button', { name: /Đang tính/ }).first()).toBeVisible();

  // --- Thu ngân ---
  await switchShift(s, '3333');
  await s.goto('/cashier');
  await s.getByRole('button', { name: new RegExp(`^${tableName}\\b`) }).click();
  await expect(s.getByRole('heading', { name: `Bàn ${tableName}` })).toBeVisible();
  const payBtn = s.getByRole('button', { name: /& đóng bàn/ });
  await expect(payBtn).toBeEnabled();
  await payBtn.click();
  await expect(s.getByText(`Đã đóng bàn ${tableName}`)).toBeVisible();

  // Khách bị đẩy sang màn cảm ơn, phiên cũ hết hiệu lực
  await expect(g.getByText('Cảm ơn quý khách')).toBeVisible({ timeout: 10_000 });

  await guest.close();
  await staff.close();
});
