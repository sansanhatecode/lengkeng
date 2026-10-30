import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerPrincipal, DevicePrincipal, Principal, StaffPrincipal } from './auth.types';
import { RegisterStoreInput } from '@lengkeng/shared';
import { StoresService } from '../stores/stores.service';

const STAFF_TTL = '12h'; // một ca làm việc
const DEVICE_TTL = '30d';
const CUSTOMER_TTL = '12h';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly stores: StoresService,
  ) {}

  /** Chủ quán tự tạo quán mới rồi đăng nhập luôn. */
  async register(input: RegisterStoreInput) {
    const { store, owner } = await this.stores.create(input);
    const staffToken = this.signStaff({ kind: 'staff', sub: owner.id, storeId: store.id, role: owner.role });
    return {
      staffToken,
      staff: { id: owner.id, name: owner.name, role: owner.role },
      store: { id: store.id, name: store.name, slug: store.slug },
    };
  }

  /** Quán bị quản trị hệ thống khóa thì không cho nhân viên vào. */
  private assertStoreActive(store: { isActive: boolean; suspendedReason: string | null }) {
    if (!store.isActive) {
      throw new ForbiddenException({ code: 'STORE_SUSPENDED', message: store.suspendedReason ? `Quán đang tạm khóa: ${store.suspendedReason}` : 'Quán đang tạm khóa. Liên hệ bộ phận hỗ trợ.' });
    }
  }

  hash(value: string) {
    return bcrypt.hash(value, 10);
  }

  verify(token: string): Principal {
    try {
      return this.jwt.verify<Principal>(token);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
  }

  /** Đăng nhập bằng email + mật khẩu. Nếu có deviceName thì đồng thời cấp token thiết bị. */
  async login(email: string, password: string, deviceName?: string) {
    const staff = await this.prisma.staff.findUnique({ where: { email }, include: { store: true } });
    if (!staff || !staff.passwordHash || !staff.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const ok = await bcrypt.compare(password, staff.passwordHash);
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    this.assertStoreActive(staff.store);

    const staffToken = this.signStaff({ kind: 'staff', sub: staff.id, storeId: staff.storeId, role: staff.role });
    let deviceToken: string | undefined;
    if (deviceName) {
      const device = await this.prisma.device.create({
        data: { storeId: staff.storeId, name: deviceName, createdById: staff.id },
      });
      deviceToken = this.jwt.sign(
        { kind: 'device', sub: device.id, storeId: staff.storeId } satisfies DevicePrincipal,
        { expiresIn: DEVICE_TTL },
      );
    }
    return {
      staffToken,
      deviceToken,
      staff: { id: staff.id, name: staff.name, role: staff.role },
      store: { id: staff.store.id, name: staff.store.name, slug: staff.store.slug },
    };
  }

  /** Nhân viên đổi ca trên thiết bị đã đăng nhập bằng PIN. */
  async pinLogin(principal: Principal, pin: string) {
    if (principal.kind !== 'staff' && principal.kind !== 'device') throw new UnauthorizedException();
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: principal.storeId }, select: { isActive: true, suspendedReason: true } });
    this.assertStoreActive(store);
    const device =
      principal.kind === 'device'
        ? await this.prisma.device.findFirst({ where: { id: principal.sub, revokedAt: null } })
        : principal.deviceId
          ? await this.prisma.device.findFirst({ where: { id: principal.deviceId, revokedAt: null } })
          : null;
    if (principal.kind === 'device' && !device) throw new UnauthorizedException('Thiết bị đã bị thu hồi');

    const candidates = await this.prisma.staff.findMany({
      where: { storeId: principal.storeId, isActive: true, pinHash: { not: null } },
    });
    for (const s of candidates) {
      if (s.pinHash && (await bcrypt.compare(pin, s.pinHash))) {
        if (device) await this.prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
        const token = this.signStaff({
          kind: 'staff',
          sub: s.id,
          storeId: s.storeId,
          role: s.role,
          deviceId: device?.id,
        });
        return { staffToken: token, staff: { id: s.id, name: s.name, role: s.role } };
      }
    }
    throw new UnauthorizedException('Mã PIN không đúng');
  }

  signStaff(p: StaffPrincipal) {
    return this.jwt.sign(p, { expiresIn: STAFF_TTL });
  }

  signCustomer(p: CustomerPrincipal) {
    return this.jwt.sign(p, { expiresIn: CUSTOMER_TTL });
  }

  async me(p: StaffPrincipal) {
    const staff = await this.prisma.staff.findUniqueOrThrow({ where: { id: p.sub }, include: { store: true } });
    return {
      staff: { id: staff.id, name: staff.name, role: staff.role },
      store: { id: staff.store.id, name: staff.store.name, slug: staff.store.slug, settings: staff.store.settings },
    };
  }
}
