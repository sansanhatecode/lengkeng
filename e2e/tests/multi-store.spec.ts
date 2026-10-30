import { test, expect } from '@playwright/test';

const stamp = Date.now();
const email = `e2e-chu-${stamp}@quan.vn`;
const storeName = `Quán E2E ${stamp}`;

test('chủ quán tự tạo quán mới → có bàn để in QR → quản trị hệ thống thấy quán', async ({ browser }) => {
  // --- Chủ quán đăng ký trên console ---
  const ownerCtx = await browser.newContext({ baseURL: 'http://localhost:5174' });
  const p = await ownerCtx.newPage();
  await p.goto('/login');
  await p.getByRole('link', { name: 'Tạo quán miễn phí' }).click();
  await expect(p.getByRole('heading', { name: 'Tạo quán mới' })).toBeVisible();
  await p.getByLabel('Tên quán').fill(storeName);
  await p.getByLabel('Số bàn ban đầu').fill('4');
  await p.getByLabel('Tên của bạn').fill('Chủ E2E');
  await p.getByLabel('Email đăng nhập').fill(email);
  await p.getByLabel('Mật khẩu (ít nhất 8 ký tự)').fill('matkhau123');
  await p.getByRole('button', { name: 'Tạo quán' }).click();

  // Vào thẳng trang Bàn & QR của quán mới, tên quán ở header, đủ 4 bàn
  await expect(p.getByText(storeName)).toBeVisible();
  await expect(p).toHaveURL(/\/admin\/tables/);
  for (const t of ['B1', 'B2', 'B3', 'B4']) await expect(p.getByText(t, { exact: true }).first()).toBeVisible();
  await expect(p.getByText('B5', { exact: true })).toHaveCount(0);
  await ownerCtx.close();

  // --- Quản trị hệ thống ---
  const sysCtx = await browser.newContext({ baseURL: 'http://localhost:5174' });
  const s = await sysCtx.newPage();
  await s.goto('/sys');
  await expect(s.getByRole('heading', { name: 'Quản trị hệ thống' })).toBeVisible();
  await s.getByLabel('Email').fill('admin@lengkeng.vn');
  await s.getByLabel('Mật khẩu').fill('admin12345');
  await s.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(s.getByRole('heading', { name: /Cửa hàng/ })).toBeVisible();
  await s.getByPlaceholder('Tìm theo tên, slug, email chủ quán').fill(email);
  const row = s.getByRole('row', { name: new RegExp(storeName) });
  await expect(row).toBeVisible();
  await expect(row.getByText('Hoạt động')).toBeVisible();
  await expect(row.getByText('Miễn phí')).toBeVisible();

  // Khóa quán → chủ quán không đăng nhập được
  s.once('dialog', (d) => d.accept('Test khóa'));
  await row.getByRole('button', { name: 'Khóa' }).click();
  await expect(row.getByText('Đã khóa')).toBeVisible();

  const again = await browser.newContext({ baseURL: 'http://localhost:5174' });
  const a = await again.newPage();
  await a.goto('/login');
  await a.getByLabel('Email').fill(email);
  await a.getByLabel('Mật khẩu').fill('matkhau123');
  await a.getByLabel('Tên thiết bị').fill('x');
  await a.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(a.getByText(/Quán đang tạm khóa: Test khóa/)).toBeVisible();
  await again.close();

  // Mở lại
  await row.getByRole('button', { name: 'Mở' }).click();
  await expect(row.getByText('Hoạt động')).toBeVisible();
  await sysCtx.close();
});
