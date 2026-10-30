import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PlatformCreateStoreSchema, PlatformUpdateStoreSchema } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { PlatformPrincipal } from '../auth/auth.types';

const PLATFORM_TTL = '8h';

/** A1 · Quản trị hệ thống: nhìn toàn bộ cửa hàng, tạo hộ, khóa/mở, gán gói. */
@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly stores: StoresService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const token = this.jwt.sign({ kind: 'platform', sub: admin.id } satisfies PlatformPrincipal, { expiresIn: PLATFORM_TTL });
    return { token, admin: { id: admin.id, name: admin.name, email: admin.email } };
  }

  async me(p: PlatformPrincipal) {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { id: p.sub } });
    if (!admin) throw new UnauthorizedException();
    return { id: admin.id, name: admin.name, email: admin.email };
  }

  async listStores(q?: string) {
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { slug: { contains: q.toLowerCase() } }, { staff: { some: { email: { contains: q.toLowerCase() } } } }] }
      : {};
    const rows = await this.prisma.store.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        staff: { where: { role: 'OWNER' }, select: { name: true, email: true }, take: 1 },
        _count: { select: { tables: true, staff: true, orders: true } },
      },
    });
    // Đơn 7 ngày gần nhất để biết quán có đang dùng thật không
    const since = new Date(Date.now() - 7 * 86400e3);
    const recent = await this.prisma.order.groupBy({ by: ['storeId'], where: { createdAt: { gte: since } }, _count: { _all: true } });
    const recentMap = new Map(recent.map((r) => [r.storeId, r._count._all]));
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      address: s.address,
      isActive: s.isActive,
      suspendedReason: s.suspendedReason,
      createdAt: s.createdAt,
      owner: s.staff[0] ?? null,
      subscription: s.subscription,
      tables: s._count.tables,
      staff: s._count.staff,
      orders: s._count.orders,
      ordersLast7d: recentMap.get(s.id) ?? 0,
    }));
  }

  async createStore(input: z.infer<typeof PlatformCreateStoreSchema>) {
    const { plan, trialDays, ...rest } = input;
    const { store, owner } = await this.stores.create(rest, { plan, trialDays });
    return { store, owner: { id: owner.id, name: owner.name, email: owner.email } };
  }

  async updateStore(id: string, input: z.infer<typeof PlatformUpdateStoreSchema>) {
    const s = await this.prisma.store.findUnique({ where: { id }, include: { subscription: true } });
    if (!s) throw new NotFoundException('Không tìm thấy cửa hàng');
    const subData = {
      ...(input.plan !== undefined ? { plan: input.plan } : {}),
      ...(input.subscriptionStatus !== undefined ? { status: input.subscriptionStatus } : {}),
      ...(input.endsAt !== undefined ? { endsAt: input.endsAt ? new Date(input.endsAt) : null } : {}),
    };
    return this.prisma.store.update({
      where: { id },
      data: {
        name: input.name,
        isActive: input.isActive,
        suspendedReason: input.isActive === true ? null : input.suspendedReason,
        ...(Object.keys(subData).length
          ? { subscription: s.subscription ? { update: subData } : { create: { plan: input.plan ?? 'FREE', status: input.subscriptionStatus ?? 'TRIAL', endsAt: subData.endsAt ?? null } } }
          : {}),
      },
      include: { subscription: true },
    });
  }
}
