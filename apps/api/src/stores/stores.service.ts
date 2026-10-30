import { ConflictException, Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { RegisterStoreInput, StoreSettingsSchema } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Bỏ dấu tiếng Việt, giữ a-z0-9 và gạch nối: "Quán Lẩu Dê Ba Cây" → "quan-lau-de-ba-cay" */
export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'quan';

/**
 * Tạo một cửa hàng mới trọn gói: cửa hàng + thuê bao + chủ quán + khu vực + bàn có mã QR.
 * Dùng chung cho tự đăng ký (auth) và quản trị hệ thống tạo hộ (platform).
 */
@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: RegisterStoreInput, opts: { plan?: Plan; trialDays?: number } = {}) {
    const existing = await this.prisma.staff.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email này đã được dùng cho một quán khác');

    const slug = await this.uniqueSlug(slugify(input.storeName));
    const trialDays = opts.trialDays ?? 30;
    const passwordHash = await bcrypt.hash(input.password, 10);
    const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: input.storeName,
          slug,
          address: input.address ?? null,
          settings: StoreSettingsSchema.parse({}),
          subscription: {
            create: {
              plan: opts.plan ?? 'FREE',
              status: 'TRIAL',
              endsAt: trialDays > 0 ? new Date(Date.now() + trialDays * 86400e3) : null,
            },
          },
        },
      });
      const owner = await tx.staff.create({
        data: { storeId: store.id, name: input.ownerName, role: 'OWNER', email: input.email, passwordHash, pinHash },
      });
      const area = await tx.area.create({ data: { storeId: store.id, name: 'Khu chính', sortOrder: 0 } });
      await tx.table.createMany({
        data: Array.from({ length: input.tableCount }, (_, i) => ({
          storeId: store.id,
          areaId: area.id,
          name: `B${i + 1}`,
          qrToken: randomBytes(16).toString('base64url'),
        })),
      });
      await tx.auditLog.create({
        data: { storeId: store.id, actorId: owner.id, action: 'STORE_CREATED', entity: 'Store', entityId: store.id, meta: { tableCount: input.tableCount } },
      });
      return { store, owner };
    });
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    for (let i = 2; await this.prisma.store.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    return slug;
  }
}
