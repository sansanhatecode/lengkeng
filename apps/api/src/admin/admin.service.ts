import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { StaffInputSchema, StoreSettingsSchema } from '@lengkeng/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { parseSettings } from '../common/settings';

type StaffInput = z.infer<typeof StaffInputSchema>;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async store(storeId: string) {
    const s = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, include: { subscription: true } });
    return { id: s.id, name: s.name, slug: s.slug, address: s.address, settings: parseSettings(s.settings), subscription: s.subscription };
  }

  async updateStore(storeId: string, data: { name?: string; address?: string | null; settings?: unknown }) {
    const current = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    const settings = data.settings ? StoreSettingsSchema.parse({ ...parseSettings(current.settings), ...(data.settings as object) }) : undefined;
    const s = await this.prisma.store.update({ where: { id: storeId }, data: { name: data.name, address: data.address, settings } });
    return { ...s, settings: parseSettings(s.settings) };
  }

  listStaff(storeId: string) {
    return this.prisma.staff.findMany({
      where: { storeId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true, email: true, isActive: true, pinHash: true, createdAt: true },
    }).then((rows) => rows.map(({ pinHash, ...r }) => ({ ...r, hasPin: !!pinHash })));
  }

  async createStaff(storeId: string, input: StaffInput) {
    if (input.email && !input.password) throw new BadRequestException('Tài khoản có email cần mật khẩu');
    if (!input.email && !input.pin) throw new BadRequestException('Nhân viên cần email + mật khẩu hoặc mã PIN');
    if (input.pin) await this.ensurePinUnique(storeId, input.pin);
    const s = await this.prisma.staff.create({
      data: {
        storeId,
        name: input.name,
        role: input.role,
        email: input.email ?? null,
        isActive: input.isActive,
        passwordHash: input.password ? await this.auth.hash(input.password) : null,
        pinHash: input.pin ? await this.auth.hash(input.pin) : null,
      },
    });
    return { id: s.id, name: s.name, role: s.role, email: s.email, isActive: s.isActive, hasPin: !!s.pinHash };
  }

  async updateStaff(storeId: string, id: string, input: Partial<StaffInput>) {
    const s = await this.prisma.staff.findFirst({ where: { id, storeId } });
    if (!s) throw new NotFoundException('Không tìm thấy nhân viên');
    if (input.pin) await this.ensurePinUnique(storeId, input.pin, id);
    const u = await this.prisma.staff.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        email: input.email,
        isActive: input.isActive,
        passwordHash: input.password ? await this.auth.hash(input.password) : undefined,
        pinHash: input.pin ? await this.auth.hash(input.pin) : undefined,
      },
    });
    return { id: u.id, name: u.name, role: u.role, email: u.email, isActive: u.isActive, hasPin: !!u.pinHash };
  }

  /** PIN phải duy nhất trong cửa hàng vì đổi ca chỉ nhập PIN, không chọn tên. */
  private async ensurePinUnique(storeId: string, pin: string, exceptId?: string) {
    const others = await this.prisma.staff.findMany({ where: { storeId, pinHash: { not: null }, ...(exceptId ? { id: { not: exceptId } } : {}) } });
    const bcrypt = await import('bcryptjs');
    for (const o of others) if (o.pinHash && (await bcrypt.compare(pin, o.pinHash))) throw new ConflictException('Mã PIN này đã có người dùng');
  }

  devices(storeId: string) {
    return this.prisma.device.findMany({ where: { storeId, revokedAt: null }, orderBy: { lastSeenAt: 'desc' } });
  }
  async revokeDevice(storeId: string, id: string) {
    const d = await this.prisma.device.findFirst({ where: { id, storeId } });
    if (!d) throw new NotFoundException('Không tìm thấy thiết bị');
    return this.prisma.device.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
