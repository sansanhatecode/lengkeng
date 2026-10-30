/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const token = () => randomBytes(16).toString('base64url');

async function main() {
  // Tài khoản quản trị hệ thống (A1). Đổi mật khẩu ngay trên môi trường thật qua biến môi trường.
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@lengkeng.vn';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD ?? 'admin12345';
  await prisma.platformAdmin.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Quản trị hệ thống', passwordHash: await bcrypt.hash(adminPassword, 10) },
  });
  console.log(`Quản trị hệ thống: ${adminEmail} / ${adminPassword} → http://localhost:5174/sys`);

  const slug = 'demo';
  const existing = await prisma.store.findUnique({ where: { slug } });
  if (existing) {
    console.log('Đã có cửa hàng demo, bỏ qua seed.');
    return;
  }

  const store = await prisma.store.create({
    data: {
      name: 'Quán Lengkeng Demo',
      slug,
      address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
      settings: { requireOrderConfirm: false, requireFirstOrderConfirm: true, sessionOpenMode: 'ON_SCAN', vatPercent: 0, autoCloseSessionHours: 4, languages: ['vi'] },
      subscription: { create: { plan: 'PRO', status: 'TRIAL', endsAt: new Date(Date.now() + 180 * 86400e3) } },
    },
  });
  const sid = store.id;

  const inside = await prisma.area.create({ data: { storeId: sid, name: 'Trong nhà', sortOrder: 0 } });
  const outside = await prisma.area.create({ data: { storeId: sid, name: 'Sân vườn', sortOrder: 1 } });
  const tables = [] as { name: string; qrToken: string }[];
  for (let i = 1; i <= 6; i++) tables.push(await prisma.table.create({ data: { storeId: sid, areaId: inside.id, name: `B${i}`, qrToken: token() } }));
  for (let i = 1; i <= 4; i++) tables.push(await prisma.table.create({ data: { storeId: sid, areaId: outside.id, name: `V${i}`, qrToken: token() } }));

  const catMon = await prisma.category.create({ data: { storeId: sid, nameVi: 'Món chính', nameEn: 'Mains', sortOrder: 0 } });
  const catNhau = await prisma.category.create({ data: { storeId: sid, nameVi: 'Món nhậu', nameEn: 'Snacks', sortOrder: 1 } });
  const catUong = await prisma.category.create({ data: { storeId: sid, nameVi: 'Đồ uống', nameEn: 'Drinks', sortOrder: 2 } });

  const item = (categoryId: string, nameVi: string, nameEn: string, price: number, station: 'KITCHEN' | 'BAR', tags: string[] = [], sortOrder = 0) =>
    ({ storeId: sid, categoryId, nameVi, nameEn, price, station, tags, sortOrder });

  await prisma.menuItem.create({
    data: {
      ...item(catMon.id, 'Lẩu thái hải sản', 'Thai seafood hotpot', 289000, 'KITCHEN', ['bán chạy', 'cay'], 0),
      descVi: 'Nồi lẩu cho 2–3 người, kèm rau và bún',
      modifierGroups: {
        create: [
          { storeId: sid, name: 'Mức cay', required: true, minSelect: 1, maxSelect: 1, modifiers: { create: [{ name: 'Ít cay', sortOrder: 0 }, { name: 'Vừa', sortOrder: 1 }, { name: 'Cay nhiều', sortOrder: 2 }] } },
          { storeId: sid, name: 'Thêm', required: false, minSelect: 0, maxSelect: 3, sortOrder: 1, modifiers: { create: [{ name: 'Thêm tôm', priceDelta: 60000 }, { name: 'Thêm mực', priceDelta: 50000 }, { name: 'Thêm rau', priceDelta: 20000 }] } },
        ],
      },
    },
  });
  await prisma.menuItem.create({ data: { ...item(catMon.id, 'Cơm chiên hải sản', 'Seafood fried rice', 79000, 'KITCHEN', [], 1) } });
  await prisma.menuItem.create({ data: { ...item(catMon.id, 'Bò lúc lắc', 'Shaking beef', 149000, 'KITCHEN', ['bán chạy'], 2) } });
  await prisma.menuItem.create({ data: { ...item(catMon.id, 'Rau muống xào tỏi', 'Stir-fried morning glory', 45000, 'KITCHEN', ['chay'], 3) } });

  await prisma.menuItem.create({
    data: {
      ...item(catNhau.id, 'Gà rang muối', 'Salt-roasted chicken', 169000, 'KITCHEN', [], 0),
      modifierGroups: { create: [{ storeId: sid, name: 'Phần', required: true, minSelect: 1, maxSelect: 1, modifiers: { create: [{ name: 'Nửa con' }, { name: 'Nguyên con', priceDelta: 150000 }] } }] },
    },
  });
  await prisma.menuItem.create({ data: { ...item(catNhau.id, 'Khô mực nướng', 'Grilled dried squid', 89000, 'KITCHEN', [], 1) } });
  await prisma.menuItem.create({ data: { ...item(catNhau.id, 'Đậu hũ chiên giòn', 'Crispy tofu', 49000, 'KITCHEN', ['chay'], 2) } });

  await prisma.menuItem.create({
    data: {
      ...item(catUong.id, 'Bia Sài Gòn', 'Saigon beer', 20000, 'BAR', ['bán chạy'], 0),
      modifierGroups: { create: [{ storeId: sid, name: 'Nhiệt độ', required: false, minSelect: 0, maxSelect: 1, modifiers: { create: [{ name: 'Lạnh' }, { name: 'Không lạnh' }] } }] },
    },
  });
  await prisma.menuItem.create({
    data: {
      ...item(catUong.id, 'Trà đào cam sả', 'Peach lemongrass tea', 45000, 'BAR', [], 1),
      modifierGroups: {
        create: [
          { storeId: sid, name: 'Đường', required: true, minSelect: 1, maxSelect: 1, modifiers: { create: [{ name: '100%' }, { name: '70%' }, { name: '50%' }, { name: '30%' }] } },
          { storeId: sid, name: 'Đá', required: true, minSelect: 1, maxSelect: 1, sortOrder: 1, modifiers: { create: [{ name: 'Bình thường' }, { name: 'Ít đá' }, { name: 'Không đá' }] } },
        ],
      },
    },
  });
  await prisma.menuItem.create({ data: { ...item(catUong.id, 'Nước suối', 'Mineral water', 15000, 'BAR', [], 2) } });
  await prisma.menuItem.create({ data: { ...item(catUong.id, 'Coca-Cola', 'Coca-Cola', 20000, 'BAR', [], 3) } });

  const h = (v: string) => bcrypt.hash(v, 10);
  await prisma.staff.createMany({
    data: [
      { storeId: sid, name: 'Chủ quán', role: 'OWNER', email: 'owner@demo.vn', passwordHash: await h('password123'), pinHash: await h('0000') },
      { storeId: sid, name: 'Lan (phục vụ)', role: 'WAITER', pinHash: await h('1111') },
      { storeId: sid, name: 'Hùng (bếp)', role: 'KITCHEN', pinHash: await h('2222') },
      { storeId: sid, name: 'Mai (thu ngân)', role: 'CASHIER', pinHash: await h('3333') },
    ],
  });

  const base = (process.env.CUSTOMER_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  console.log('Seed xong. Đăng nhập: owner@demo.vn / password123. PIN: phục vụ 1111, bếp 2222, thu ngân 3333, chủ quán 0000');
  console.log('Link QR bàn đầu tiên:', `${base}/t/${tables[0]!.qrToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
